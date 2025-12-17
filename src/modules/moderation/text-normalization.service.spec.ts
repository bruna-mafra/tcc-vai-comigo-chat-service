import { Test, TestingModule } from '@nestjs/testing';
import { TextNormalizationService } from './text-normalization.service';
import { AppLogger } from '@shared/logger/app.logger';

describe('TextNormalizationService', () => {
  let service: TextNormalizationService;

  const mockAppLogger = {
    debug: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TextNormalizationService,
        {
          provide: AppLogger,
          useValue: mockAppLogger,
        },
      ],
    }).compile();

    service = module.get<TextNormalizationService>(TextNormalizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('normalize', () => {
    it('should normalize text with character substitutions', () => {
      const input = 'H3ll0 W0rld';
      const result = service.normalize(input);

      expect(result.original).toBe(input);
      expect(result.normalized).toContain('hello');
      expect(result.normalized).toContain('world');
    });

    it('should remove excessive whitespace', () => {
      const input = 'Hello    World';
      const result = service.normalize(input);

      expect(result.normalized).toBe('hello world');
    });

    it('should handle @ to a replacement', () => {
      const input = '@dmin';
      const result = service.normalize(input);

      expect(result.normalized).toContain('admin');
    });
  });

  describe('calculateSimilarity', () => {
    it('should return high similarity for similar strings', () => {
      const original = 'hello';
      const normalized = 'hello';

      const similarity = service.calculateSimilarity(original, normalized);

      expect(similarity).toBeGreaterThan(0.9);
    });
  });
});
