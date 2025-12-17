import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@database/database.module';
import { ChatModule } from '@modules/chat/chat.module';
import { ModerationModule } from '@modules/moderation/moderation.module';
import { BullModule } from '@nestjs/bull';
import { AppLogger } from '@shared/logger/app.logger';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    DatabaseModule,
    ChatModule,
    ModerationModule,
  ],
  providers: [AppLogger],
})
export class AppModule {}
