import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import Message from '@/models/Message';
import Channel from '@/models/Channel';
import { analyzeSentiment } from '@/lib/sentiment';
import { getUserInfo, getChannelInfo, cleanSlackMessage, parseSlackTimestamp } from '@/lib/slack';

// Verify Slack request signature
function verifySlackSignature(body: string, signature: string, timestamp: string): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET!;
  
  // Check timestamp to prevent replay attacks (max 5 minutes old)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
    return false;
  }
  
  // Create signature
  const hmac = crypto.createHmac('sha256', signingSecret);
  hmac.update(`v0:${timestamp}:${body}`);
  const expectedSignature = `v0=${hmac.digest('hex')}`;
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-slack-signature');
    const timestamp = request.headers.get('x-slack-request-timestamp');
    
    // Verify request is from Slack
    if (!signature || !timestamp || !verifySlackSignature(body, signature, timestamp)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    const payload = JSON.parse(body);
    
    // Handle URL verification challenge
    if (payload.type === 'url_verification') {
      return NextResponse.json({ challenge: payload.challenge });
    }
    
    // Handle events
    if (payload.type === 'event_callback') {
      const event = payload.event;
      
      // Handle message events
      if (event.type === 'message' && !event.subtype) {
        await handleMessageEvent(event);
      }
      
      // Handle reaction events
      if (event.type === 'reaction_added' || event.type === 'reaction_removed') {
        await handleReactionEvent(event);
      }
    }
    
    return NextResponse.json({ status: 'ok' });
    
  } catch (error) {
    console.error('Slack webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

async function handleMessageEvent(event: any) {
  try {
    await connectDB();
    
    // Check if channel is monitored
    const channel = await Channel.findOne({ 
      slackChannelId: event.channel,
      isMonitored: true 
    });
    
    if (!channel) {
      return; // Channel not monitored
    }
    
    // Skip bot messages if configured
    if (!channel.settings.includeBots && event.bot_id) {
      return;
    }
    
    // Skip thread messages if configured
    if (!channel.settings.includeThreads && event.thread_ts) {
      return;
    }
    
    // Get user and channel info
    const [userInfo, channelInfo] = await Promise.all([
      getUserInfo(event.user),
      getChannelInfo(event.channel)
    ]);
    
    if (!userInfo || !channelInfo) {
      console.error('Failed to get user or channel info');
      return;
    }
    
    // Clean and analyze message
    const cleanedText = cleanSlackMessage(event.text || '');
    if (!cleanedText || cleanedText.length < 3) {
      return; // Skip very short or empty messages
    }
    
    // Analyze sentiment
    const sentimentResult = await analyzeSentiment(cleanedText, []);
    
    // Calculate message metadata
    const metadata = {
      messageType: event.thread_ts ? 'thread_reply' : 'message',
      hasLinks: /https?:\/\//.test(event.text || ''),
      hasEmojis: /:[\w+-]+:/.test(event.text || '') || /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu.test(event.text || ''),
      wordCount: cleanedText.split(/\s+/).filter(word => word.length > 0).length
    };
    
    // Create message document
    const messageDoc = new Message({
      slackChannelId: event.channel,
      slackChannelName: channelInfo.name,
      slackUserId: event.user,
      slackUserName: userInfo.name,
      content: cleanedText,
      timestamp: parseSlackTimestamp(event.ts),
      slackTimestamp: event.ts,
      sentimentScore: sentimentResult.score,
      sentimentLabel: sentimentResult.sentiment,
      confidence: sentimentResult.confidence,
      burnoutSignals: sentimentResult.burnoutSignals,
      reactions: [],
      threadTs: event.thread_ts,
      isThread: !!event.thread_ts,
      metadata
    });
    
    await messageDoc.save();
    
    // Update channel stats
    await updateChannelStats(event.channel);
    
    console.log(`Processed message from ${userInfo.name} in ${channelInfo.name}: ${sentimentResult.sentiment} (${sentimentResult.score.toFixed(2)})`);
    
  } catch (error) {
    console.error('Error handling message event:', error);
  }
}

async function handleReactionEvent(event: any) {
  try {
    await connectDB();
    
    // Find the message this reaction belongs to
    const message = await Message.findOne({ slackTimestamp: event.item.ts });
    
    if (!message) {
      return; // Message not found (might not be monitored)
    }
    
    // Update reactions array
    const reactionIndex = message.reactions.findIndex((r: any) => r.emoji === event.reaction);
    
    if (event.type === 'reaction_added') {
      if (reactionIndex >= 0) {
        message.reactions[reactionIndex].count += 1;
      } else {
        message.reactions.push({
          emoji: event.reaction,
          count: 1,
          sentiment: 0 // Will be calculated in re-analysis
        });
      }
    } else if (event.type === 'reaction_removed') {
      if (reactionIndex >= 0) {
        message.reactions[reactionIndex].count -= 1;
        if (message.reactions[reactionIndex].count <= 0) {
          message.reactions.splice(reactionIndex, 1);
        }
      }
    }
    
    // Re-analyze sentiment with updated reactions
    const reactions = message.reactions.map((r: any) => ({ emoji: r.emoji, count: r.count }));
    const sentimentResult = await analyzeSentiment(message.content, reactions);
    
    // Update message sentiment
    message.sentimentScore = sentimentResult.score;
    message.sentimentLabel = sentimentResult.sentiment;
    message.confidence = sentimentResult.confidence;
    message.burnoutSignals = sentimentResult.burnoutSignals;
    
    await message.save();
    
    console.log(`Updated reactions for message ${event.item.ts}: ${event.type} ${event.reaction}`);
    
  } catch (error) {
    console.error('Error handling reaction event:', error);
  }
}

async function updateChannelStats(channelId: string) {
  try {
    // Get recent messages for this channel (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentMessages = await Message.find({
      slackChannelId: channelId,
      timestamp: { $gte: yesterday }
    });
    
    if (recentMessages.length === 0) return;
    
    // Calculate average sentiment
    const avgSentiment = recentMessages.reduce((sum, msg) => sum + msg.sentimentScore, 0) / recentMessages.length;
    
    // Update channel stats
    await Channel.findOneAndUpdate(
      { slackChannelId: channelId },
      {
        $set: {
          'stats.avgDailySentiment': avgSentiment,
          lastMessageAt: new Date()
        },
        $inc: {
          'stats.totalMessages': 1
        }
      }
    );
    
  } catch (error) {
    console.error('Error updating channel stats:', error);
  }
}