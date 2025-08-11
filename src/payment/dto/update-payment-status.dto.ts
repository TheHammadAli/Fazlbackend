import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePaymentStatusDto {
  @ApiProperty({ example: 'txn_abc123' })
  @IsString()
  transactionId: string;

  @ApiProperty({ enum: ['success', 'failed', 'cancelled'], example: 'success' })
  @IsIn(['success', 'failed', 'cancelled'])
  status: 'success' | 'failed' | 'cancelled';
}
