import { IsString, IsNotEmpty, MinLength, MaxLength, IsMongoId } from 'class-validator';

export class CreateMessageDto {
  @IsMongoId()
  @IsNotEmpty()
  rideId: string;

  @IsMongoId()
  @IsNotEmpty()
  senderId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(500)
  content: string;
}

export class MessageResponseDto {
  id: string;
  rideId: string;
  senderId: string;
  content: string;
  timestamp: Date;
  status: 'active' | 'flagged' | 'removed';
  isFlagged?: boolean;
  flagReason?: string;
}

export class MessageEventDto {
  type: 'message:send' | 'message:update' | 'message:delete';
  payload: any;
  timestamp: Date;
}
