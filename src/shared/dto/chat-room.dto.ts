import { IsString, IsNotEmpty, IsMongoId, IsArray } from 'class-validator';

export class CreateChatRoomDto {
  @IsMongoId()
  @IsNotEmpty()
  rideId: string;

  @IsMongoId()
  @IsNotEmpty()
  driverId: string;

  @IsArray()
  @IsMongoId({ each: true })
  passengerIds: string[];
}

export class ChatRoomResponseDto {
  id: string;
  rideId: string;
  driverId: string;
  passengerIds: string[];
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
}

export class JoinChatRoomDto {
  @IsMongoId()
  @IsNotEmpty()
  rideId: string;

  @IsMongoId()
  @IsNotEmpty()
  userId: string;
}
