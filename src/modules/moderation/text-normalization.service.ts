import { Injectable } from '@nestjs/common';
import { NormalizedTextDto } from '@shared/dto/moderation.dto';
import { AppLogger } from '@shared/logger/app.logger';

@Injectable()
export class TextNormalizationService {
  private readonly replacements: Record<string, string> = {
    '@': 'a',
    '0': 'o',
    '1': 'i',
    '3': 'e',
    '4': 'a',
    '5': 's',
    '7': 't',
    '8': 'b',
    '$': 's',
  };

  constructor(private readonly logger: AppLogger) {}

  /**
   * Normalizes text by:
   * - Removing excessive whitespace
   * - Converting to lowercase
   * - Replacing common character substitutions
   * - Removing special characters but keeping spaces and basic punctuation
   */
  normalize(text: string): NormalizedTextDto {
    const original = text;
    let normalized = text;

    // Convert to lowercase
    normalized = normalized.toLowerCase();

    // Remove excessive whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();

    // Apply character replacements
    const appliedReplacements: Record<string, string> = {};
    for (const [char, replacement] of Object.entries(this.replacements)) {
      if (normalized.includes(char)) {
        const regex = new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        normalized = normalized.replace(regex, replacement);
        appliedReplacements[char] = replacement;
      }
    }

    // Remove special characters but keep common punctuation and spaces
    normalized = normalized.replace(/[^a-z0-9\s.,!?;:\-']/g, '');

    this.logger.debug(`Text normalized: "${original}" -> "${normalized}"`);

    return {
      original,
      normalized,
      replacements: appliedReplacements,
    };
  }

  /**
   * Calculates a simple similarity score between original and normalized text
   * Returns a value between 0 and 1, where 1 means identical
   */
  calculateSimilarity(original: string, normalized: string): number {
    const originalLower = original.toLowerCase();
    const normalizedLower = normalized.toLowerCase();

    const longer =
      originalLower.length > normalizedLower.length ? originalLower : normalizedLower;
    const shorter =
      originalLower.length > normalizedLower.length ? normalizedLower : originalLower;

    if (longer.length === 0) {
      return 1.0;
    }

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculates Levenshtein distance between two strings
   */
  private levenshteinDistance(s1: string, s2: string): number {
    const costs: number[] = [];

    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) {
        costs[s2.length] = lastValue;
      }
    }

    return costs[s2.length];
  }
}
