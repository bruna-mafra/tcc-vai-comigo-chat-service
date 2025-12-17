import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { AppLogger } from '@shared/logger/app.logger';
import { ModerationResultDto } from '@shared/dto/moderation.dto';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class OpenAIModerationService {
  private readonly apiKey: string;
  private readonly openaiApiUrl = 'https://api.openai.com/v1/moderations';

  constructor(
    private readonly logger: AppLogger,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!this.apiKey) {
      this.logger.warn('OpenAI API key not configured. Moderation will be skipped.');
    }
  }

  /**
   * Sends text to OpenAI Moderation API and returns the result
   */
  async moderate(
    text: string,
    messageId: string,
  ): Promise<ModerationResultDto> {
    if (!this.apiKey) {
      this.logger.warn('OpenAI API key not configured. Skipping moderation.');
      return {
        messageId,
        isFlagged: false,
        categories: {
          sexual: false,
          hate: false,
          harassment: false,
          'self-harm': false,
          'sexual/minors': false,
          'hate/threatening': false,
          'violence/graphic': false,
          violence: false,
        },
        categoryScores: {
          sexual: 0,
          hate: 0,
          harassment: 0,
          'self-harm': 0,
          'sexual/minors': 0,
          'hate/threatening': 0,
          'violence/graphic': 0,
          violence: 0,
        },
      };
    }

    try {
      const response = await axios.post(
        this.openaiApiUrl,
        { input: text },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: parseInt(process.env.MODERATION_TIMEOUT || '5000'),
        },
      );

      const result = response.data.results[0];

      const flagReason = this.generateFlagReason(result.categories);

      this.logger.debug(
        `Moderation result for message ${messageId}:`,
        result.flagged ? 'FLAGGED' : 'SAFE',
      );

      return {
        messageId,
        isFlagged: result.flagged,
        categories: result.categories,
        categoryScores: result.category_scores,
        flagReason: result.flagged ? flagReason : undefined,
      };
    } catch (error) {
      this.logger.error(
        `OpenAI Moderation API error for message ${messageId}:`,
        error.message,
      );

      // In case of API error, we log but don't block the message
      // (fail-open approach for resilience)
      return {
        messageId,
        isFlagged: false,
        categories: {
          sexual: false,
          hate: false,
          harassment: false,
          'self-harm': false,
          'sexual/minors': false,
          'hate/threatening': false,
          'violence/graphic': false,
          violence: false,
        },
        categoryScores: {
          sexual: 0,
          hate: 0,
          harassment: 0,
          'self-harm': 0,
          'sexual/minors': 0,
          'hate/threatening': 0,
          'violence/graphic': 0,
          violence: 0,
        },
      };
    }
  }

  /**
   * Generates a human-readable reason for why content was flagged
   */
  private generateFlagReason(categories: Record<string, boolean>): string {
    const flaggedCategories = Object.entries(categories)
      .filter(([, value]) => value)
      .map(([key]) => key);

    if (flaggedCategories.length === 0) {
      return 'Content violates community guidelines';
    }

    const categoryNames: Record<string, string> = {
      sexual: 'sexual content',
      hate: 'hate speech',
      harassment: 'harassment',
      'self-harm': 'self-harm content',
      'sexual/minors': 'sexual content involving minors',
      'hate/threatening': 'hate speech and threats',
      'violence/graphic': 'graphic violence',
      violence: 'violent content',
    };

    const reasons = flaggedCategories
      .map((cat) => categoryNames[cat] || cat)
      .join(', ');

    return `Message contains ${reasons}`;
  }
}
