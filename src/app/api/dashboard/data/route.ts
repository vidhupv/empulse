import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DailyAggregate from '@/models/DailyAggregate';
import WeeklyInsight from '@/models/WeeklyInsight';
import { startOfDay, subDays, startOfWeek } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '7d';
    const dataType = searchParams.get('type') || 'sentiment';
    
    await connectDB();
    
    if (dataType === 'sentiment') {
      return await getSentimentData(timeframe);
    } else if (dataType === 'insights') {
      return await getWeeklyInsights();
    } else if (dataType === 'burnout') {
      return await getBurnoutAlerts();
    }
    
    return NextResponse.json({ error: 'Invalid data type' }, { status: 400 });
    
  } catch (error) {
    console.error('Dashboard data error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}

async function getSentimentData(timeframe: string) {
  const days = timeframe === '30d' ? 30 : 7;
  const startDate = startOfDay(subDays(new Date(), days - 1));
  
  const pipeline = [
    {
      $match: {
        date: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
        avgSentiment: { $avg: "$avgSentiment" },
        totalMessages: { $sum: "$messageCount" },
        date: { $first: "$date" }
      }
    },
    {
      $sort: { date: 1 as 1 }
    }
  ];
  
  const results = await DailyAggregate.aggregate(pipeline);
  
  const sentimentData = results.map(result => ({
    date: new Date(result.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    sentiment: Number(result.avgSentiment.toFixed(2)),
    messageCount: result.totalMessages
  }));
  
  return NextResponse.json({ data: sentimentData });
}

async function getWeeklyInsights() {
  const currentWeekStart = startOfWeek(new Date());
  
  const insight = await WeeklyInsight.findOne({
    teamId: 'default',
    weekStart: { $lte: currentWeekStart }
  }).sort({ weekStart: -1 });
  
  if (!insight) {
    return NextResponse.json({
      data: {
        insights: ['No insights available yet. More data needed.'],
        recommendations: ['Continue monitoring team communication patterns.'],
        overallTrend: 'stable'
      }
    });
  }
  
  return NextResponse.json({
    data: {
      insights: insight.insights,
      recommendations: insight.recommendations,
      overallTrend: insight.overallTrend,
      weekStart: insight.weekStart
    }
  });
}

async function getBurnoutAlerts() {
  const recentDate = subDays(new Date(), 7);
  
  // Get recent daily aggregates with high burnout risk
  const highRiskChannels = await DailyAggregate.find({
    date: { $gte: recentDate },
    burnoutRisk: { $gt: 0.3 }
  }).sort({ date: -1 });
  
  // Group by channel and get latest data
  const channelRisks: Record<string, any> = {};
  
  for (const aggregate of highRiskChannels) {
    if (!channelRisks[aggregate.channelId] || aggregate.date > channelRisks[aggregate.channelId].date) {
      channelRisks[aggregate.channelId] = aggregate;
    }
  }
  
  const burnoutAlerts = Object.values(channelRisks).map((aggregate: any) => {
    const riskLevel = aggregate.burnoutRisk > 0.7 ? 'high' : 
                     aggregate.burnoutRisk > 0.5 ? 'medium' : 'low';
    
    const signals = [
      `${(aggregate.burnoutRisk * 100).toFixed(1)}% burnout risk detected`,
      aggregate.avgSentiment < 0.4 ? 'Low sentiment in recent messages' : '',
      aggregate.sentimentTrend === 'declining' ? 'Declining sentiment trend' : '',
      aggregate.messageCount > 100 ? 'High message volume detected' : ''
    ].filter(Boolean);
    
    return {
      id: aggregate._id,
      channelId: aggregate.channelId,
      channelName: aggregate.channelName,
      riskLevel,
      signals,
      affectedUsers: aggregate.activeUsers || 1,
      detectedAt: aggregate.date,
      severity: aggregate.burnoutRisk
    };
  }).sort((a, b) => b.severity - a.severity);
  
  return NextResponse.json({ data: burnoutAlerts });
}