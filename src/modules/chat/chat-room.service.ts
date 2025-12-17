import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatRoom } from '@database/schemas/chat-room.schema';
import { CreateChatRoomDto, ChatRoomResponseDto } from '@shared/dto/chat-room.dto';
import { AppLogger } from '@shared/logger/app.logger';

@Injectable()
export class ChatRoomService {
  constructor(
    @InjectModel(ChatRoom.name) private chatRoomModel: Model<ChatRoom>,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Creates a new chat room for a ride
   */
  async createChatRoom(dto: CreateChatRoomDto): Promise<ChatRoomResponseDto> {
    try {
      // Check if chat room already exists for this ride
      const existingChatRoom = await this.chatRoomModel.findOne({
        rideId: dto.rideId,
      });

      if (existingChatRoom && !existingChatRoom.isClosed) {
        throw new ConflictException(
          `Chat room already exists for ride ${dto.rideId}`,
        );
      }

      const chatRoom = await this.chatRoomModel.create({
        rideId: dto.rideId,
        driverId: dto.driverId,
        passengerIds: dto.passengerIds,
        messageCount: 0,
        isClosed: false,
      });

      this.logger.debug(
        `Chat room created for ride ${dto.rideId} with ID ${chatRoom._id}`,
      );

      return this.mapChatRoomToResponse(chatRoom);
    } catch (error) {
      this.logger.error('Failed to create chat room:', error.message);
      throw error;
    }
  }

  /**
   * Retrieves a chat room by ride ID
   */
  async getChatRoomByRideId(rideId: string): Promise<ChatRoomResponseDto> {
    try {
      const chatRoom = await this.chatRoomModel.findOne({ rideId });
      if (!chatRoom) {
        throw new NotFoundException(`Chat room for ride ${rideId} not found`);
      }

      return this.mapChatRoomToResponse(chatRoom);
    } catch (error) {
      this.logger.error('Failed to retrieve chat room:', error.message);
      throw error;
    }
  }

  /**
   * Retrieves a chat room by ID
   */
  async getChatRoomById(chatRoomId: string): Promise<ChatRoomResponseDto> {
    try {
      const chatRoom = await this.chatRoomModel.findById(chatRoomId);
      if (!chatRoom) {
        throw new NotFoundException(`Chat room ${chatRoomId} not found`);
      }

      return this.mapChatRoomToResponse(chatRoom);
    } catch (error) {
      this.logger.error('Failed to retrieve chat room:', error.message);
      throw error;
    }
  }

  /**
   * Adds a passenger to a chat room
   */
  async addPassenger(rideId: string, passengerId: string): Promise<ChatRoomResponseDto> {
    try {
      const chatRoom = await this.chatRoomModel.findOne({ rideId });
      if (!chatRoom) {
        throw new NotFoundException(`Chat room for ride ${rideId} not found`);
      }

      if (chatRoom.passengerIds.includes(passengerId)) {
        this.logger.warn(
          `Passenger ${passengerId} is already in chat room for ride ${rideId}`,
        );
        return this.mapChatRoomToResponse(chatRoom);
      }

      chatRoom.passengerIds.push(passengerId);
      await chatRoom.save();

      this.logger.debug(
        `Passenger ${passengerId} added to chat room for ride ${rideId}`,
      );

      return this.mapChatRoomToResponse(chatRoom);
    } catch (error) {
      this.logger.error('Failed to add passenger:', error.message);
      throw error;
    }
  }

  /**
   * Removes a passenger from a chat room
   */
  async removePassenger(rideId: string, passengerId: string): Promise<ChatRoomResponseDto> {
    try {
      const chatRoom = await this.chatRoomModel.findOne({ rideId });
      if (!chatRoom) {
        throw new NotFoundException(`Chat room for ride ${rideId} not found`);
      }

      chatRoom.passengerIds = chatRoom.passengerIds.filter(
        (id) => id !== passengerId,
      );
      await chatRoom.save();

      this.logger.debug(
        `Passenger ${passengerId} removed from chat room for ride ${rideId}`,
      );

      return this.mapChatRoomToResponse(chatRoom);
    } catch (error) {
      this.logger.error('Failed to remove passenger:', error.message);
      throw error;
    }
  }

  /**
   * Closes a chat room
   */
  async closeChatRoom(rideId: string): Promise<ChatRoomResponseDto> {
    try {
      const chatRoom = await this.chatRoomModel.findOneAndUpdate(
        { rideId },
        {
          $set: {
            isClosed: true,
            closedAt: new Date(),
          },
        },
        { new: true },
      );

      if (!chatRoom) {
        throw new NotFoundException(`Chat room for ride ${rideId} not found`);
      }

      this.logger.debug(`Chat room for ride ${rideId} closed`);

      return this.mapChatRoomToResponse(chatRoom);
    } catch (error) {
      this.logger.error('Failed to close chat room:', error.message);
      throw error;
    }
  }

  /**
   * Maps a ChatRoom document to a response DTO
   */
  private mapChatRoomToResponse(chatRoom: any): ChatRoomResponseDto {
    return {
      id: chatRoom._id.toString(),
      rideId: chatRoom.rideId,
      driverId: chatRoom.driverId,
      passengerIds: chatRoom.passengerIds,
      createdAt: chatRoom.createdAt,
      updatedAt: chatRoom.updatedAt,
      messageCount: chatRoom.messageCount,
    };
  }
}
