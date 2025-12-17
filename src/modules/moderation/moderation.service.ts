import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { TextNormalizationService } from './text-normalization.service';
import { OpenAIModerationService } from './openai-moderation.service';
import { AppLogger } from '@shared/logger/app.logger';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Message } from '@database/schemas/message.schema';

export interface ModerationJobData {
  messageId: string;
  content: string;
  senderId: string;
  rideId: string;
}

@Injectable()
export class ModerationService {
  constructor(
    @InjectQueue('message-moderation') private moderationQueue: Queue,
    private readonly textNormalizationService: TextNormalizationService,
    private readonly openaiModerationService: OpenAIModerationService,
    private readonly logger: AppLogger,
    @InjectModel(Message.name) private messageModel: Model<Message>,
  ) {}

  /**
   * Enqueue a message for asynchronous moderation
   */
  async enqueueMessageForModeration(
    messageId: string,
    content: string,
    senderId: string,
    rideId: string,
  ): Promise<void> {
    try {
      await this.moderationQueue.add(
        {
          messageId,
          content,
          senderId,
          rideId,
        } as ModerationJobData,
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      this.logger.debug(`Message ${messageId} enqueued for moderation`);
    } catch (error) {
      this.logger.error(
        `Failed to enqueue message ${messageId} for moderation:`,
        error.message,
      );
    }
  }

  /**
   * Process moderation for a single message
   */
  async processModeration(data: ModerationJobData): Promise<void> {
    const { messageId, content, senderId, rideId } = data;

    try {
      this.logger.debug(`Processing moderation for message ${messageId}`);

      // Step 1: Normalize text
      const normalizedResult = this.textNormalizationService.normalize(content);

      // Step 2: Check with OpenAI Moderation API
      const moderationResult = await this.openaiModerationService.moderate(
        normalizedResult.normalized,
        messageId,
      );

      // Step 3: Update message in database based on result
      if (moderationResult.isFlagged) {
        this.logger.warn(
          `Message ${messageId} flagged for: ${moderationResult.flagReason}`,
        );

        await this.messageModel.updateOne(
          { _id: messageId },
          {
            $set: {
              status: 'flagged',
              isFlagged: true,
              flagReason: moderationResult.flagReason,
              moderationDetails: {
                categories: moderationResult.categories,
                categoryScores: moderationResult.categoryScores,
                flaggedAt: new Date(),
                moderationModel: 'openai-text-moderation-latest',
              },
            },
          },
        );

        // TODO: Implement user flagging logic (e.g., disable user after N flags)
        this.logger.info(
          `Message ${messageId} from user ${senderId} in ride ${rideId} has been flagged`,
        );
      }

      this.logger.debug(`Moderation processing completed for message ${messageId}`);
    } catch (error) {
      this.logger.error(
        `Error processing moderation for message ${messageId}:`,
        error.message,
      );
      throw error;
    }
  }
}
