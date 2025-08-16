import mongoose, { Schema, Document } from 'mongoose';

export interface IReaction {
  emoji: string;
  count: number;
  sentiment: number;
}

export interface IMessage extends Document {
  slackChannelId: string;
  slackChannelName: string;
  slackUserId: string;
  slackUserName: string;
  content: string;
  timestamp: Date;
  slackTimestamp: string;
  sentimentScore: number;
  sentimentLabel: 'positive' | 'neutral' | 'negative';
  confidence: number;
  burnoutSignals: boolean;
  reactions: IReaction[];
  threadTs?: string;
  isThread: boolean;
  metadata: {
    messageType: string;
    hasLinks: boolean;
    hasEmojis: boolean;
    wordCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ReactionSchema = new Schema<IReaction>({
  emoji: { type: String, required: true },
  count: { type: Number, required: true, default: 0 },
  sentiment: { type: Number, required: true, default: 0 }
});

const MessageSchema = new Schema<IMessage>({
  slackChannelId: { type: String, required: true, index: true },
  slackChannelName: { type: String, required: true },
  slackUserId: { type: String, required: true, index: true },
  slackUserName: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, required: true, index: true },
  slackTimestamp: { type: String, required: true, unique: true },
  sentimentScore: { type: Number, required: true, min: 0, max: 1 },
  sentimentLabel: { 
    type: String, 
    required: true, 
    enum: ['positive', 'neutral', 'negative'] 
  },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  burnoutSignals: { type: Boolean, required: true, default: false },
  reactions: [ReactionSchema],
  threadTs: { type: String },
  isThread: { type: Boolean, required: true, default: false },
  metadata: {
    messageType: { type: String, required: true, default: 'message' },
    hasLinks: { type: Boolean, required: true, default: false },
    hasEmojis: { type: Boolean, required: true, default: false },
    wordCount: { type: Number, required: true, default: 0 }
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
MessageSchema.index({ slackChannelId: 1, timestamp: -1 });
MessageSchema.index({ timestamp: -1 });
MessageSchema.index({ sentimentLabel: 1, timestamp: -1 });

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);