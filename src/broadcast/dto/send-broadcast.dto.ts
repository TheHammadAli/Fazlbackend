import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class SendBroadcastMessageDto {
  @ApiProperty({
    example: "662f1b2c8f1a2b3c4d5e6f7d",
    description: "Receiver user ID",
  })
  @IsString()
  @IsNotEmpty()
  receiverId: string;

  @ApiProperty({
    example: "662f1b2c8f1a2b3c4d5e6f7c",
    description: "Thread ID (usually sellerId)",
  })
  @IsString()
  @IsNotEmpty()
  threadId: string;

  @ApiProperty({
    example: "I can supply at best price",
    required: false,
  })
  @IsString()
  @IsOptional()
  message: string;

  @ApiProperty({ type: "string", format: "binary", required: false })
  file?: any;

  @ApiProperty({ type: "string", format: "binary", required: false })
  voice?: any;

  @ApiProperty({ required: false, description: "Voice message length in seconds" })
  duration?: string;
}
