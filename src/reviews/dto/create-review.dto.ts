import {
  IsIn,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ example: 'userId123' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 'itemId456' })
  @IsString()
  itemId: string;

  @ApiProperty({ enum: ['product', 'service'], example: 'product' })
  @IsIn(['product', 'service'])
  itemType: 'product' | 'service';

  @ApiProperty({ minimum: 1, maximum: 5, example: 4 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ maxLength: 1000, example: 'Great product!' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
