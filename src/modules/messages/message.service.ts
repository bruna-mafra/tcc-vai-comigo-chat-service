import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message } from '@database/schemas/message.schema';
import { ChatRoom } from '@database/schemas/chat-room.schema';
import { CreateMessageDto, MessageResponseDto } from '@shared/dto/message.dto';
import { AppLogger } from '@shared/logger/app.logger';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<Message>,
    @InjectModel(ChatRoom.name) private chatRoomModel: Model<ChatRoom>,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Creates a new message
   */
  async createMessage(dto: CreateMessageDto): Promise<MessageResponseDto> {
    // Verify that the chat room exists
    const chatRoom = await this.chatRoomModel.findOne({ rideId: dto.rideId });
    if (!chatRoom) {
      throw new NotFoundException(`Chat room for ride ${dto.rideId} not found`);
    }

    // Verify that the sender is authorized to send messages in this chat room
    if (!this.isUserAuthorizedForChatRoom(dto.senderId, chatRoom)) {
      throw new ForbiddenException(
        `User ${dto.senderId} is not authorized to send messages in ride ${dto.rideId}`,
      );
    }

    try {
      const message = await this.messageModel.create({
        rideId: dto.rideId,
        senderId: dto.senderId,
        content: dto.content,
        status: 'active',
        timestamp: new Date(),
      });

      // Increment message count in chat room
      await this.chatRoomModel.updateOne(
        { _id: chatRoom._id },
        { $inc: { messageCount: 1 } },
      );

      this.logger.debug(
        `Message created: ${message._id} in ride ${dto.rideId}`,
      );

      return this.mapMessageToResponse(message);
    } catch (error) {
      this.logger.error('Failed to create message:', error.message);
      throw error;
    }
  }

  /**
   * Retrieves messages for a specific chat room
   */
  async getMessagesByRideId(
    rideId: string,
    limit: number = 50,
    skip: number = 0,
  ): Promise<MessageResponseDto[]> {
    try {
      const messages = await this.messageModel
        .find({ rideId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .exec();

      return messages.map((msg) => this.mapMessageToResponse(msg));
    } catch (error) {
      this.logger.error('Failed to retrieve messages:', error.message);
      throw error;
    }
  }

  /**
   * Retrieves a single message by ID
   */
  async getMessageById(messageId: string): Promise<MessageResponseDto> {
    try {
      const message = await this.messageModel.findById(messageId);
      if (!message) {
        throw new NotFoundException(`Message ${messageId} not found`);
      }

      return this.mapMessageToResponse(message);
    } catch (error) {
      this.logger.error('Failed to retrieve message:', error.message);
      throw error;
    }
  }

  /**
   * Deletes a message (hard delete or soft delete based on policy)
   */
  async deleteMessage(
    messageId: string,
    userId: string,
  ): Promise<void> {
    try {
      const message = await this.messageModel.findById(messageId);
      if (!message) {
        throw new NotFoundException(`Message ${messageId} not found`);
      }

      // Verify authorization: only sender or admins can delete
      if (message.senderId !== userId) {
        throw new ForbiddenException(
          'Only message sender can delete this message',
        );
      }

      // Soft delete: mark as removed
      await this.messageModel.updateOne(
        { _id: messageId },
        { $set: { status: 'removed' } },
      );

      this.logger.debug(`Message ${messageId} marked as removed`);
    } catch (error) {
      this.logger.error('Failed to delete message:', error.message);
      throw error;
    }
  }

  /**
   * Retrieves message count for a specific chat room
   */
  async getMessageCount(rideId: string): Promise<number> {
    try {
      return await this.messageModel.countDocuments({ rideId });
    } catch (error) {
      this.logger.error('Failed to get message count:', error.message);
      throw error;
    }
  }

  /**
   * Verifies if a user is authorized for a chat room
   */
  private isUserAuthorizedForChatRoom(userId: string, chatRoom: ChatRoom): boolean {
    return (
      chatRoom.driverId === userId ||
      chatRoom.passengerIds.includes(userId)
    );
  }

  /**
   * Maps a Message document to a response DTO
   */
  private mapMessageToResponse(message: any): MessageResponseDto {
    return {
      id: message._id.toString(),
      rideId: message.rideId,
      senderId: message.senderId,
      content: message.content,
      timestamp: message.timestamp,
      status: message.status,
      isFlagged: message.isFlagged,
      flagReason: message.flagReason,
    };
  }
}
