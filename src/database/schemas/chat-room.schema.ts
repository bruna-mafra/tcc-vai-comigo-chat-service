import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class ChatRoom extends Document {
  @Prop({ type: String, required: true, unique: true })
  rideId: string;

  @Prop({ type: String, required: true })
  driverId: string;

  @Prop({ type: [String], required: true })
  passengerIds: string[];

  @Prop({ type: Number, default: 0 })
  messageCount: number;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;

  @Prop({ type: Date, nullable: true })
  closedAt: Date;

  @Prop({ type: Boolean, default: false })
  isClosed: boolean;
}

export const ChatRoomSchema = SchemaFactory.createForClass(ChatRoom);

// Indexes for performance
ChatRoomSchema.index({ rideId: 1 });
ChatRoomSchema.index({ driverId: 1 });
ChatRoomSchema.index({ isClosed: 1 });
