import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatGateway } from './chat.gateway';
import { ChatRoomService } from './chat-room.service';
import { Message, MessageSchema } from '@database/schemas/message.schema';
import { ChatRoom, ChatRoomSchema } from '@database/schemas/chat-room.schema';
import { MessageService } from '@modules/messages/message.service';
import { ModerationModule } from '@modules/moderation/moderation.module';
import { AppLogger } from '@shared/logger/app.logger';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: ChatRoom.name, schema: ChatRoomSchema },
    ]),
    ModerationModule,
  ],
  providers: [ChatGateway, ChatRoomService, MessageService, AppLogger],
  exports: [ChatRoomService, MessageService],
})
export class ChatModule {}
