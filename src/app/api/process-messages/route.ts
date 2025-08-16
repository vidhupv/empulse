import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Message from '@/models/Message';
import Channel from '@/models/Channel';
import { analyzeSentiment } from '@/lib/sentiment';
import { getChannelHistory, getUserInfo, getChannelInfo, cleanSlackMessage, parseSlackTimestamp } from '@/lib/slack';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Get all monitored channels
    const monitoredChannels = await Channel.find({ isMonitored: true });
    
    if (monitoredChannels.length === 0) {
      return NextResponse.json({ error: 'No channels being monitored' }, { status: 400 });
    }
    
    let totalProcessed = 0;
    const results = [];
    
    for (const channel of monitoredChannels) {
      try {
        console.log(`Processing channel: ${channel.name}`);
        
        // Get recent messages from this channel (last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const oneDayAgoTs = (oneDayAgo.getTime() / 1000).toString();
        
        const messages = await getChannelHistory(
          channel.slackChannelId,
          oneDayAgoTs,
          undefined,
          100
        );
        
        console.log(`Found ${messages.length} messages in ${channel.name}`);
        
        let processedCount = 0;
        
        for (const message of messages) {
          // Skip if message already exists
          const existingMessage = await Message.findOne({ slackTimestamp: message.ts });
          if (existingMessage) {
            continue;
          }
          
          // Skip bot messages and system messages
          if (message.user === 'USLACKBOT' || !message.text || message.text.trim().length < 3) {
            continue;
          }
          
          try {
            // Get user info
            const userInfo = await getUserInfo(message.user);
            if (!userInfo) continue;
            
            // Clean message text
            const cleanedText = cleanSlackMessage(message.text);
            if (cleanedText.length < 3) continue;
            
            // Analyze sentiment
            const reactions = message.reactions?.map(r => ({ emoji: r.name, count: r.count })) || [];
            const sentimentResult = await analyzeSentiment(cleanedText, reactions);
            
            // Calculate metadata
            const metadata = {
              messageType: message.thread_ts ? 'thread_reply' : 'message',
              hasLinks: /https?:\/\//.test(message.text),
              hasEmojis: /:[\w+-]+:/.test(message.text) || /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu.test(message.text),
              wordCount: cleanedText.split(/\s+/).filter(word => word.length > 0).length
            };
            
            // Store message
            const messageDoc = new Message({
              slackChannelId: channel.slackChannelId,
              slackChannelName: channel.name,
              slackUserId: message.user,
              slackUserName: userInfo.name,
              content: cleanedText,
              timestamp: parseSlackTimestamp(message.ts),
              slackTimestamp: message.ts,
              sentimentScore: sentimentResult.score,
              sentimentLabel: sentimentResult.sentiment,
              confidence: sentimentResult.confidence,
              burnoutSignals: sentimentResult.burnoutSignals,
              reactions: reactions.map(r => ({ emoji: r.emoji, count: r.count, sentiment: 0 })),
              threadTs: message.thread_ts,
              isThread: !!message.thread_ts,
              metadata
            });
            
            await messageDoc.save();
            processedCount++;
            
            console.log(`Processed message: "${cleanedText}" - ${sentimentResult.sentiment} (${sentimentResult.score.toFixed(2)})`);
            
          } catch (error) {
            console.error('Error processing individual message:', error);
            continue;
          }
        }
        
        totalProcessed += processedCount;
        results.push({
          channelId: channel.slackChannelId,
          channelName: channel.name,
          messagesFound: messages.length,
          messagesProcessed: processedCount
        });
        
      } catch (error) {
        console.error(`Error processing channel ${channel.name}:`, error);
        results.push({
          channelId: channel.slackChannelId,
          channelName: channel.name,
          error: error.message
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      totalProcessed,
      results
    });
    
  } catch (error) {
    console.error('Message processing error:', error);
    return NextResponse.json({ error: 'Failed to process messages' }, { status: 500 });
  }
}