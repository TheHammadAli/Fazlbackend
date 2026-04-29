import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class SendBroadcastMessageDto {
  @ApiProperty({
    example: '662f1b2c8f1a2b3c4d5e6f7d',
    description: 'Receiver user ID',
  })
  @IsString()
  @IsNotEmpty()
  receiverId: string;

  @ApiProperty({
    example: '662f1b2c8f1a2b3c4d5e6f7c',
    description: 'Thread ID (usually sellerId)',
  })
  @IsString()
  @IsNotEmpty()
  threadId: string;

  @ApiProperty({
    example: 'I can supply at best price',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  file?: any;

}