import connectDB from './mongodb';
import Message from '@/models/Message';
import DailyAggregate from '@/models/DailyAggregate';
import WeeklyInsight from '@/models/WeeklyInsight';
import { generateWeeklyInsights } from './sentiment';
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, format } from 'date-fns';

export async function aggregateDailyData(date: Date = new Date()) {
  await connectDB();
  
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  
  // Get all messages for this day grouped by channel
  const pipeline = [
    {
      $match: {
        timestamp: { $gte: dayStart, $lte: dayEnd }
      }
    },
    {
      $group: {
        _id: '$slackChannelId',
        channelName: { $first: '$slackChannelName' },
        messages: { $push: '$$ROOT' },
        messageCount: { $sum: 1 },
        avgSentiment: { $avg: '$sentimentScore' },
        positiveCount: { 
          $sum: { $cond: [{ $eq: ['$sentimentLabel', 'positive'] }, 1, 0] }
        },
        neutralCount: { 
          $sum: { $cond: [{ $eq: ['$sentimentLabel', 'neutral'] }, 1, 0] }
        },
        negativeCount: { 
          $sum: { $cond: [{ $eq: ['$sentimentLabel', 'negative'] }, 1, 0] }
        },
        burnoutCount: { 
          $sum: { $cond: ['$burnoutSignals', 1, 0] }
        },
        uniqueUsers: { $addToSet: '$slackUserId' },
        reactions: { $push: '$reactions' }
      }
    }
  ];

  const results = await Message.aggregate(pipeline);
  
  for (const result of results) {
    const channelId = result._id;
    
    // Calculate burnout risk (0-1 scale)
    const burnoutRisk = result.burnoutCount / result.messageCount;
    
    // Calculate trend by comparing with previous day
    const previousDay = subDays(date, 1);
    const previousAggregate = await DailyAggregate.findOne({
      channelId,
      date: { $gte: startOfDay(previousDay), $lte: endOfDay(previousDay) }
    });
    
    let sentimentTrend: 'improving' | 'stable' | 'declining' = 'stable';
    if (previousAggregate) {
      const sentimentDiff = result.avgSentiment - previousAggregate.avgSentiment;
      if (sentimentDiff > 0.05) sentimentTrend = 'improving';
      else if (sentimentDiff < -0.05) sentimentTrend = 'declining';
    }
    
    // Process reactions
    const allReactions = result.reactions.flat();
    const emojiCounts: Record<string, { count: number; sentiment: number }> = {};
    
    for (const reactionGroup of allReactions) {
      for (const reaction of reactionGroup) {
        if (!emojiCounts[reaction.emoji]) {
          emojiCounts[reaction.emoji] = { count: 0, sentiment: reaction.sentiment };
        }
        emojiCounts[reaction.emoji].count += reaction.count;
      }
    }
    
    const topEmojis = Object.entries(emojiCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([emoji, data]) => ({
        emoji,
        count: data.count,
        sentiment: data.sentiment
      }));

    // Create or update daily aggregate
    await DailyAggregate.findOneAndUpdate(
      { channelId, date: dayStart },
      {
        channelName: result.channelName,
        avgSentiment: result.avgSentiment,
        messageCount: result.messageCount,
        positiveCount: result.positiveCount,
        neutralCount: result.neutralCount,
        negativeCount: result.negativeCount,
        burnoutRisk,
        topEmojis,
        activeUsers: result.uniqueUsers.length,
        sentimentTrend
      },
      { upsert: true, new: true }
    );
  }
  
  console.log(`Aggregated daily data for ${format(date, 'yyyy-MM-dd')}: ${results.length} channels`);
}

export async function generateWeeklyInsightReport(weekStart: Date = startOfWeek(new Date())) {
  await connectDB();
  
  const weekEnd = endOfWeek(weekStart);
  
  // Get daily aggregates for this week
  const dailyAggregates = await DailyAggregate.find({
    date: { $gte: weekStart, $lte: weekEnd }
  }).sort({ date: 1 });
  
  // Group by channel
  const channelData: Record<string, any> = {};
  
  for (const aggregate of dailyAggregates) {
    if (!channelData[aggregate.channelId]) {
      channelData[aggregate.channelId] = {
        channelId: aggregate.channelId,
        channelName: aggregate.channelName,
        dailyData: [],
        totalMessages: 0,
        avgSentiment: 0,
        burnoutRisk: 0
      };
    }
    
    channelData[aggregate.channelId].dailyData.push(aggregate);
    channelData[aggregate.channelId].totalMessages += aggregate.messageCount;
  }
  
  // Calculate weekly averages for each channel
  const weeklyChannelData = Object.values(channelData).map((channel: any) => {
    const dailyData = channel.dailyData;
    const avgSentiment = dailyData.reduce((sum: number, day: any) => sum + day.avgSentiment, 0) / dailyData.length;
    const avgBurnoutRisk = dailyData.reduce((sum: number, day: any) => sum + day.burnoutRisk, 0) / dailyData.length;
    
    // Determine trend
    const firstHalf = dailyData.slice(0, Math.ceil(dailyData.length / 2));
    const secondHalf = dailyData.slice(Math.ceil(dailyData.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum: number, day: any) => sum + day.avgSentiment, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum: number, day: any) => sum + day.avgSentiment, 0) / secondHalf.length;
    
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    const trendDiff = secondHalfAvg - firstHalfAvg;
    if (trendDiff > 0.05) trend = 'improving';
    else if (trendDiff < -0.05) trend = 'declining';
    
    return {
      channelId: channel.channelId,
      channelName: channel.channelName,
      avgSentiment,
      messageCount: channel.totalMessages,
      burnoutRisk: avgBurnoutRisk,
      trend
    };
  });
  
  if (weeklyChannelData.length === 0) {
    console.log('No data available for weekly insights generation');
    return;
  }
  
  // Generate AI insights and recommendations
  const { insights, recommendations } = await generateWeeklyInsights(weeklyChannelData);
  
  // Calculate overall metrics
  const overallSentiment = weeklyChannelData.reduce((sum, channel) => sum + channel.avgSentiment, 0) / weeklyChannelData.length;
  const totalMessages = weeklyChannelData.reduce((sum, channel) => sum + channel.messageCount, 0);
  
  const improvingChannels = weeklyChannelData.filter(c => c.trend === 'improving').length;
  const decliningChannels = weeklyChannelData.filter(c => c.trend === 'declining').length;
  
  let overallTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (improvingChannels > decliningChannels) overallTrend = 'improving';
  else if (decliningChannels > improvingChannels) overallTrend = 'declining';
  
  // Identify burnout alerts
  const burnoutAlerts = weeklyChannelData
    .filter(channel => channel.burnoutRisk > 0.3)
    .map(channel => ({
      channelId: channel.channelId,
      channelName: channel.channelName,
      riskLevel: channel.burnoutRisk > 0.7 ? 'high' as const : 
                 channel.burnoutRisk > 0.5 ? 'medium' as const : 'low' as const,
      signals: [
        `Burnout risk: ${(channel.burnoutRisk * 100).toFixed(1)}%`,
        channel.avgSentiment < 0.4 ? 'Low sentiment detected' : '',
        channel.trend === 'declining' ? 'Declining sentiment trend' : ''
      ].filter(Boolean)
    }));
  
  // Calculate key metrics
  const engagementScore = Math.min(1, totalMessages / (weeklyChannelData.length * 50)); // Normalize based on expected activity
  const participationRate = weeklyChannelData.length > 0 ? 1 : 0; // Simplified for now
  const responseTime = 2; // Simplified - would need more complex calculation
  const positivityRatio = overallSentiment;
  
  // Create or update weekly insight
  await WeeklyInsight.findOneAndUpdate(
    { teamId: 'default', weekStart },
    {
      weekEnd,
      teamName: 'Default Team',
      channels: weeklyChannelData,
      overallTrend,
      overallSentiment,
      totalMessages,
      insights,
      recommendations,
      burnoutAlerts,
      keyMetrics: {
        engagementScore,
        participationRate,
        responseTime,
        positivityRatio
      }
    },
    { upsert: true, new: true }
  );
  
  console.log(`Generated weekly insights for week starting ${format(weekStart, 'yyyy-MM-dd')}`);
}

export async function runDailyAggregation() {
  try {
    const today = new Date();
    await aggregateDailyData(today);
    
    // Also generate weekly insights if it's Monday (start of new week)
    if (today.getDay() === 1) {
      const lastWeekStart = startOfWeek(subDays(today, 7));
      await generateWeeklyInsightReport(lastWeekStart);
    }
  } catch (error) {
    console.error('Error running daily aggregation:', error);
    throw error;
  }
}

export async function backfillAggregation(days: number = 7) {
  try {
    console.log(`Starting backfill for last ${days} days...`);
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      await aggregateDailyData(date);
    }
    
    // Generate weekly insight for the current week
    const currentWeekStart = startOfWeek(new Date());
    await generateWeeklyInsightReport(currentWeekStart);
    
    console.log(`Backfill completed for ${days} days`);
  } catch (error) {
    console.error('Error during backfill:', error);
    throw error;
  }
}