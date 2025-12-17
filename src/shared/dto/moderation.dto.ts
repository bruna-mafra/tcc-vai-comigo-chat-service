export class ModerationResultDto {
  messageId: string;
  isFlagged: boolean;
  categories: {
    sexual: boolean;
    hate: boolean;
    harassment: boolean;
    'self-harm': boolean;
    'sexual/minors': boolean;
    'hate/threatening': boolean;
    'violence/graphic': boolean;
    violence: boolean;
  };
  categoryScores: {
    sexual: number;
    hate: number;
    harassment: number;
    'self-harm': number;
    'sexual/minors': number;
    'hate/threatening': number;
    'violence/graphic': number;
    violence: number;
  };
  flagReason?: string;
}

export class NormalizedTextDto {
  original: string;
  normalized: string;
  replacements: Record<string, string>;
}
