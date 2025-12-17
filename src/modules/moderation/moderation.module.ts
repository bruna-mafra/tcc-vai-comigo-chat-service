import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { MongooseModule } from '@nestjs/mongoose';
import { ModerationService } from './moderation.service';
import { TextNormalizationService } from './text-normalization.service';
import { OpenAIModerationService } from './openai-moderation.service';
import { ModerationConsumer } from './moderation.consumer';
import { Message, MessageSchema } from '@database/schemas/message.schema';
import { AppLogger } from '@shared/logger/app.logger';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: 'message-moderation',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
  ],
  providers: [
    ModerationService,
    TextNormalizationService,
    OpenAIModerationService,
    ModerationConsumer,
    AppLogger,
  ],
  exports: [ModerationService],
})
export class ModerationModule {}
