import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MessageService } from './message.service';
import { Message } from '@database/schemas/message.schema';
import { ChatRoom } from '@database/schemas/chat-room.schema';
import { AppLogger } from '@shared/logger/app.logger';

describe('MessageService', () => {
  let service: MessageService;
  let module: TestingModule;

  const mockMessageModel = {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    updateOne: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockChatRoomModel = {
    findOne: jest.fn(),
    updateOne: jest.fn(),
  };

  const mockAppLogger = {
    debug: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        MessageService,
        {
          provide: getModelToken(Message.name),
          useValue: mockMessageModel,
        },
        {
          provide: getModelToken(ChatRoom.name),
          useValue: mockChatRoomModel,
        },
        {
          provide: AppLogger,
          useValue: mockAppLogger,
        },
      ],
    }).compile();

    service = module.get<MessageService>(MessageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createMessage', () => {
    it('should create a message successfully', async () => {
      const dto = {
        rideId: '507f1f77bcf86cd799439011',
        senderId: '507f1f77bcf86cd799439012',
        content: 'Hello, World!',
      };

      const chatRoom = {
        _id: '1',
        rideId: dto.rideId,
        driverId: dto.senderId,
        passengerIds: [],
      };

      const createdMessage = {
        _id: '507f1f77bcf86cd799439013',
        ...dto,
        status: 'active',
        timestamp: new Date(),
      };

      mockChatRoomModel.findOne.mockResolvedValue(chatRoom);
      mockMessageModel.create.mockResolvedValue(createdMessage);

      const result = await service.createMessage(dto);

      expect(result).toBeDefined();
      expect(result.content).toBe(dto.content);
      expect(mockMessageModel.create).toHaveBeenCalledWith(expect.objectContaining(dto));
    });
  });

  describe('getMessagesByRideId', () => {
    it('should retrieve messages for a ride', async () => {
      const rideId = '507f1f77bcf86cd799439011';
      const messages = [
        {
          _id: '1',
          rideId,
          senderId: 'user1',
          content: 'Message 1',
          timestamp: new Date(),
          status: 'active',
        },
      ];

      mockMessageModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(messages),
            }),
          }),
        }),
      });

      const result = await service.getMessagesByRideId(rideId);

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
    });
  });
});
