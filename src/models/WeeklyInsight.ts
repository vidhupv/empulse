import mongoose, { Schema, Document } from 'mongoose';

export interface IWeeklyInsight extends Document {
  weekStart: Date;
  weekEnd: Date;
  teamId: string;
  teamName: string;
  channels: Array<{
    channelId: string;
    channelName: string;
    avgSentiment: number;
    messageCount: number;
    burnoutRisk: number;
  }>;
  overallTrend: 'improving' | 'stable' | 'declining';
  overallSentiment: number;
  totalMessages: number;
  insights: string[];
  recommendations: string[];
  burnoutAlerts: Array<{
    channelId: string;
    channelName: string;
    riskLevel: 'low' | 'medium' | 'high';
    signals: string[];
  }>;
  keyMetrics: {
    engagementScore: number;
    participationRate: number;
    responseTime: number;
    positivityRatio: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const WeeklyInsightSchema = new Schema<IWeeklyInsight>({
  weekStart: { type: Date, required: true, index: true },
  weekEnd: { type: Date, required: true },
  teamId: { type: String, required: true, index: true },
  teamName: { type: String, required: true },
  channels: [{
    channelId: { type: String, required: true },
    channelName: { type: String, required: true },
    avgSentiment: { type: Number, required: true },
    messageCount: { type: Number, required: true },
    burnoutRisk: { type: Number, required: true }
  }],
  overallTrend: { 
    type: String, 
    required: true, 
    enum: ['improving', 'stable', 'declining'] 
  },
  overallSentiment: { type: Number, required: true, min: 0, max: 1 },
  totalMessages: { type: Number, required: true, default: 0 },
  insights: [{ type: String }],
  recommendations: [{ type: String }],
  burnoutAlerts: [{
    channelId: { type: String, required: true },
    channelName: { type: String, required: true },
    riskLevel: { 
      type: String, 
      required: true, 
      enum: ['low', 'medium', 'high'] 
    },
    signals: [{ type: String }]
  }],
  keyMetrics: {
    engagementScore: { type: Number, required: true, min: 0, max: 1 },
    participationRate: { type: Number, required: true, min: 0, max: 1 },
    responseTime: { type: Number, required: true }, // in hours
    positivityRatio: { type: Number, required: true, min: 0, max: 1 }
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
WeeklyInsightSchema.index({ teamId: 1, weekStart: -1 });
WeeklyInsightSchema.index({ weekStart: -1 });

// Unique constraint to prevent duplicate weekly insights
WeeklyInsightSchema.index({ teamId: 1, weekStart: 1 }, { unique: true });

export default mongoose.models.WeeklyInsight || mongoose.model<IWeeklyInsight>('WeeklyInsight', WeeklyInsightSchema);