import mongoose, { Schema, Document } from 'mongoose';

export interface IDailyAggregate extends Document {
  date: Date;
  channelId: string;
  channelName: string;
  avgSentiment: number;
  messageCount: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  burnoutRisk: number;
  topEmojis: Array<{
    emoji: string;
    count: number;
    sentiment: number;
  }>;
  activeUsers: number;
  sentimentTrend: 'improving' | 'stable' | 'declining';
  createdAt: Date;
  updatedAt: Date;
}

const DailyAggregateSchema = new Schema<IDailyAggregate>({
  date: { type: Date, required: true, index: true },
  channelId: { type: String, required: true, index: true },
  channelName: { type: String, required: true },
  avgSentiment: { type: Number, required: true, min: 0, max: 1 },
  messageCount: { type: Number, required: true, default: 0 },
  positiveCount: { type: Number, required: true, default: 0 },
  neutralCount: { type: Number, required: true, default: 0 },
  negativeCount: { type: Number, required: true, default: 0 },
  burnoutRisk: { type: Number, required: true, min: 0, max: 1, default: 0 },
  topEmojis: [{
    emoji: { type: String, required: true },
    count: { type: Number, required: true },
    sentiment: { type: Number, required: true }
  }],
  activeUsers: { type: Number, required: true, default: 0 },
  sentimentTrend: { 
    type: String, 
    required: true, 
    enum: ['improving', 'stable', 'declining'],
    default: 'stable'
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
DailyAggregateSchema.index({ channelId: 1, date: -1 });
DailyAggregateSchema.index({ date: -1 });

// Unique constraint to prevent duplicate daily aggregates
DailyAggregateSchema.index({ channelId: 1, date: 1 }, { unique: true });

export default mongoose.models.DailyAggregate || mongoose.model<IDailyAggregate>('DailyAggregate', DailyAggregateSchema);