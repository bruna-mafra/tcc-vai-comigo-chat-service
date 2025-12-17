import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import { ChatRoomService } from './chat-room.service';
import { MessageService } from '@modules/messages/message.service';
import { ModerationService } from '@modules/moderation/moderation.service';
import { AppLogger } from '@shared/logger/app.logger';
import { CreateMessageDto } from '@shared/dto/message.dto';
import { CreateChatRoomDto } from '@shared/dto/chat-room.dto';
import { WsExceptionFilter } from '@shared/filters/ws-exception.filter';

interface UserSocket {
  userId: string;
  rideId: string;
  socket: Socket;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
@UseFilters(WsExceptionFilter)
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('ChatGateway');
  private readonly connectedUsers: Map<string, UserSocket> = new Map();

  constructor(
    private readonly chatRoomService: ChatRoomService,
    private readonly messageService: MessageService,
    private readonly moderationService: ModerationService,
    private readonly appLogger: AppLogger,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    this.appLogger.log('WebSocket Gateway initialized');
  }

  async handleConnection(socket: Socket) {
    this.logger.log(`Client connected: ${socket.id}`);
    this.appLogger.debug(`Client connected: ${socket.id}`);
  }

  async handleDisconnect(socket: Socket) {
    this.logger.log(`Client disconnected: ${socket.id}`);
    this.appLogger.debug(`Client disconnected: ${socket.id}`);

    // Remove from connected users
    this.connectedUsers.forEach((value, key) => {
      if (value.socket.id === socket.id) {
        this.connectedUsers.delete(key);
        
        // Notify others that user left
        const rideRoom = `ride:${value.rideId}`;
        this.server.to(rideRoom).emit('user:left', {
          userId: value.userId,
          rideId: value.rideId,
          timestamp: new Date(),
        });
      }
    });
  }

  /**
   * Join a chat room
   * Expects: { rideId: string, userId: string }
   */
  @SubscribeMessage('join:room')
  async handleJoinRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { rideId: string; userId: string },
  ) {
    try {
      const { rideId, userId } = data;

      // Verify chat room exists
      const chatRoom = await this.chatRoomService.getChatRoomByRideId(rideId);

      // Verify user is authorized
      const isAuthorized =
        chatRoom.driverId === userId ||
        chatRoom.passengerIds.includes(userId);

      if (!isAuthorized) {
        socket.emit('error', {
          message: `User ${userId} is not authorized for ride ${rideId}`,
        });
        this.appLogger.warn(
          `Unauthorized join attempt: user ${userId} for ride ${rideId}`,
        );
        return;
      }

      // Join socket to room
      const rideRoom = `ride:${rideId}`;
      socket.join(rideRoom);

      // Store user connection info
      const userKey = `${userId}:${rideId}`;
      this.connectedUsers.set(userKey, {
        userId,
        rideId,
        socket,
      });

      // Get message history
      const messages = await this.messageService.getMessagesByRideId(rideId, 50);

      // Send confirmation
      socket.emit('room:joined', {
        rideId,
        userId,
        chatRoom,
        messageHistory: messages,
        timestamp: new Date(),
      });

      // Notify others that user joined
      socket.to(rideRoom).emit('user:joined', {
        userId,
        rideId,
        timestamp: new Date(),
      });

      this.appLogger.debug(
        `User ${userId} joined chat room for ride ${rideId}`,
      );
    } catch (error) {
      socket.emit('error', {
        message: error.message,
      });
      this.appLogger.error('Failed to join room:', error.message);
    }
  }

  /**
   * Leave a chat room
   */
  @SubscribeMessage('leave:room')
  async handleLeaveRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { rideId: string; userId: string },
  ) {
    try {
      const { rideId, userId } = data;
      const rideRoom = `ride:${rideId}`;

      socket.leave(rideRoom);

      const userKey = `${userId}:${rideId}`;
      this.connectedUsers.delete(userKey);

      // Notify others that user left
      this.server.to(rideRoom).emit('user:left', {
        userId,
        rideId,
        timestamp: new Date(),
      });

      this.appLogger.debug(
        `User ${userId} left chat room for ride ${rideId}`,
      );
    } catch (error) {
      socket.emit('error', {
        message: error.message,
      });
      this.appLogger.error('Failed to leave room:', error.message);
    }
  }

  /**
   * Send message to chat room
   * Expects: { rideId: string, senderId: string, content: string }
   */
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: CreateMessageDto,
  ) {
    try {
      const { rideId, senderId, content } = data;

      // Validate input
      if (!rideId || !senderId || !content) {
        socket.emit('error', {
          message: 'Missing required fields: rideId, senderId, content',
        });
        return;
      }

      // Create message in database
      const message = await this.messageService.createMessage(data);

      // Broadcast message to all users in the room
      const rideRoom = `ride:${rideId}`;
      this.server.to(rideRoom).emit('message:received', {
        ...message,
        timestamp: new Date(),
      });

      // Emit confirmation to sender
      socket.emit('message:sent', {
        messageId: message.id,
        timestamp: new Date(),
      });

      // Enqueue for asynchronous moderation
      await this.moderationService.enqueueMessageForModeration(
        message.id,
        content,
        senderId,
        rideId,
      );

      this.appLogger.debug(
        `Message ${message.id} sent by user ${senderId} in ride ${rideId}`,
      );
    } catch (error) {
      socket.emit('error', {
        message: error.message,
      });
      this.appLogger.error('Failed to send message:', error.message);
    }
  }

  /**
   * Delete message
   */
  @SubscribeMessage('message:delete')
  async handleDeleteMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { messageId: string; rideId: string; userId: string },
  ) {
    try {
      const { messageId, rideId, userId } = data;

      // Delete message
      await this.messageService.deleteMessage(messageId, userId);

      // Notify all users in the room
      const rideRoom = `ride:${rideId}`;
      this.server.to(rideRoom).emit('message:deleted', {
        messageId,
        timestamp: new Date(),
      });

      this.appLogger.debug(
        `Message ${messageId} deleted by user ${userId} in ride ${rideId}`,
      );
    } catch (error) {
      socket.emit('error', {
        message: error.message,
      });
      this.appLogger.error('Failed to delete message:', error.message);
    }
  }

  /**
   * Get connected users in a room
   */
  @SubscribeMessage('users:list')
  async handleGetConnectedUsers(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { rideId: string },
  ) {
    try {
      const { rideId } = data;

      const connectedUserIds = Array.from(this.connectedUsers.values())
        .filter((user) => user.rideId === rideId)
        .map((user) => user.userId);

      socket.emit('users:connected', {
        rideId,
        connectedUsers: connectedUserIds,
        timestamp: new Date(),
      });

      this.appLogger.debug(
        `Connected users list sent for ride ${rideId}: ${connectedUserIds.join(', ')}`,
      );
    } catch (error) {
      socket.emit('error', {
        message: error.message,
      });
      this.appLogger.error('Failed to get connected users:', error.message);
    }
  }

  /**
   * Typing indicator
   */
  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { rideId: string; userId: string },
  ) {
    const { rideId, userId } = data;
    const rideRoom = `ride:${rideId}`;

    socket.to(rideRoom).emit('typing:active', {
      userId,
      timestamp: new Date(),
    });
  }

  /**
   * Stop typing indicator
   */
  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { rideId: string; userId: string },
  ) {
    const { rideId, userId } = data;
    const rideRoom = `ride:${rideId}`;

    socket.to(rideRoom).emit('typing:stopped', {
      userId,
      timestamp: new Date(),
    });
  }
}
