import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({ type: String, required: true })
  rideId: string;

  @Prop({ type: String, required: true })
  senderId: string;

  @Prop({ type: String, required: true, maxlength: 500 })
  content: string;

  @Prop({ type: String, enum: ['active', 'flagged', 'removed'], default: 'active' })
  status: 'active' | 'flagged' | 'removed';

  @Prop({ type: Boolean, default: false })
  isFlagged: boolean;

  @Prop({ type: String, nullable: true })
  flagReason: string;

  @Prop({ type: Object, nullable: true })
  moderationDetails: {
    categories: Record<string, boolean>;
    categoryScores: Record<string, number>;
    flaggedAt: Date;
    moderationModel: string;
  };

  @Prop({ type: Date, default: Date.now })
  timestamp: Date;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Indexes for performance
MessageSchema.index({ rideId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ status: 1 });
MessageSchema.index({ rideId: 1, isFlagged: 1 });
