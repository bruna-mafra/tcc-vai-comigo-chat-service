import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { ModerationService, ModerationJobData } from './moderation.service';
import { AppLogger } from '@shared/logger/app.logger';

@Processor('message-moderation')
export class ModerationConsumer {
  constructor(
    private readonly moderationService: ModerationService,
    private readonly logger: AppLogger,
  ) {}

  @Process()
  async processModerationJob(job: Job<ModerationJobData>) {
    this.logger.debug(`Processing moderation job ${job.id} for message ${job.data.messageId}`);

    try {
      await this.moderationService.processModeration(job.data);
      this.logger.debug(`Moderation job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(
        `Moderation job ${job.id} failed:`,
        error.message,
      );
      throw error;
    }
  }
}
