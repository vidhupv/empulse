import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Channel from '@/models/Channel';
import { listChannels, getChannelInfo, joinChannel } from '@/lib/slack';

export async function GET() {
  try {
    await connectDB();
    
    // Get monitored channels from database
    const monitoredChannels = await Channel.find({ isMonitored: true }).sort({ name: 1 });
    
    // Get available channels from Slack
    const slackChannels = await listChannels();
    
    return NextResponse.json({
      monitored: monitoredChannels,
      available: slackChannels
    });
    
  } catch (error) {
    console.error('Error fetching channels:', error);
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { channelIds, teamId = 'default', teamName = 'Default Team', addedBy = 'system' } = await request.json();
    
    if (!channelIds || !Array.isArray(channelIds)) {
      return NextResponse.json({ error: 'channelIds array is required' }, { status: 400 });
    }
    
    await connectDB();
    
    const results = [];
    
    for (const channelId of channelIds) {
      try {
        // Check if channel is already monitored
        const existingChannel = await Channel.findOne({ slackChannelId: channelId });
        
        if (existingChannel) {
          if (!existingChannel.isMonitored) {
            // Re-enable monitoring
            existingChannel.isMonitored = true;
            await existingChannel.save();
            results.push({ channelId, status: 'enabled', channel: existingChannel });
          } else {
            results.push({ channelId, status: 'already_monitored', channel: existingChannel });
          }
          continue;
        }
        
        // Get channel info from Slack
        const channelInfo = await getChannelInfo(channelId);
        
        if (!channelInfo) {
          results.push({ channelId, status: 'error', error: 'Channel not found' });
          continue;
        }
        
        // Try to join the channel if we're not a member
        if (!channelInfo.is_member && !channelInfo.is_private) {
          const joined = await joinChannel(channelId);
          if (!joined) {
            results.push({ channelId, status: 'error', error: 'Failed to join channel' });
            continue;
          }
        }
        
        // Create new monitored channel
        const newChannel = new Channel({
          slackChannelId: channelId,
          name: channelInfo.name,
          teamId,
          teamName,
          isMonitored: true,
          addedBy,
          addedAt: new Date(),
          settings: {
            includeBots: false,
            includeThreads: true,
            sensitivityLevel: 'medium',
            alertThreshold: 0.3
          },
          stats: {
            totalMessages: 0,
            avgDailySentiment: 0.5,
            lastWeekTrend: 'stable'
          }
        });
        
        await newChannel.save();
        results.push({ channelId, status: 'added', channel: newChannel });
        
      } catch (error) {
        console.error(`Error adding channel ${channelId}:`, error);
        results.push({ channelId, status: 'error', error: 'Failed to add channel' });
      }
    }
    
    return NextResponse.json({ results });
    
  } catch (error) {
    console.error('Error adding channels:', error);
    return NextResponse.json({ error: 'Failed to add channels' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');
    
    if (!channelId) {
      return NextResponse.json({ error: 'channelId is required' }, { status: 400 });
    }
    
    await connectDB();
    
    // Disable monitoring instead of deleting (to preserve historical data)
    const result = await Channel.findOneAndUpdate(
      { slackChannelId: channelId },
      { isMonitored: false },
      { new: true }
    );
    
    if (!result) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }
    
    return NextResponse.json({ status: 'disabled', channel: result });
    
  } catch (error) {
    console.error('Error removing channel:', error);
    return NextResponse.json({ error: 'Failed to remove channel' }, { status: 500 });
  }
}