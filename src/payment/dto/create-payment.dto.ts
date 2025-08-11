import { IsMongoId, IsNumber, IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ example: '6645f1d8a8c02c2b8f5a9df0' })
  @IsString()
  userId: string;

  @ApiProperty({ example: '6650aa2f17e0114f1e7a9a89' })
  @IsString()
  itemId: string;

  @ApiProperty({ enum: ['product', 'service'], example: 'product' })
  @IsIn(['product', 'service'])
  itemType: 'product' | 'service';

  @ApiProperty({ example: 499.99 })
  @IsNumber()
  amount: number;
}
