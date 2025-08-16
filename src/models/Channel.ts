import mongoose, { Schema, Document } from 'mongoose';

export interface IChannel extends Document {
  slackChannelId: string;
  name: string;
  teamId: string;
  teamName: string;
  isMonitored: boolean;
  addedBy: string;
  addedAt: Date;
  lastMessageAt?: Date;
  settings: {
    includeBots: boolean;
    includeThreads: boolean;
    sensitivityLevel: 'low' | 'medium' | 'high';
    alertThreshold: number;
  };
  stats: {
    totalMessages: number;
    avgDailySentiment: number;
    lastWeekTrend: 'improving' | 'stable' | 'declining';
  };
  createdAt: Date;
  updatedAt: Date;
}

const ChannelSchema = new Schema<IChannel>({
  slackChannelId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  teamId: { type: String, required: true, index: true },
  teamName: { type: String, required: true },
  isMonitored: { type: Boolean, required: true, default: true },
  addedBy: { type: String, required: true },
  addedAt: { type: Date, required: true, default: Date.now },
  lastMessageAt: { type: Date },
  settings: {
    includeBots: { type: Boolean, required: true, default: false },
    includeThreads: { type: Boolean, required: true, default: true },
    sensitivityLevel: { 
      type: String, 
      required: true, 
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    alertThreshold: { type: Number, required: true, default: 0.3, min: 0, max: 1 }
  },
  stats: {
    totalMessages: { type: Number, required: true, default: 0 },
    avgDailySentiment: { type: Number, required: true, default: 0.5, min: 0, max: 1 },
    lastWeekTrend: { 
      type: String, 
      required: true, 
      enum: ['improving', 'stable', 'declining'],
      default: 'stable'
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
ChannelSchema.index({ teamId: 1, isMonitored: 1 });
ChannelSchema.index({ isMonitored: 1 });

export default mongoose.models.Channel || mongoose.model<IChannel>('Channel', ChannelSchema);