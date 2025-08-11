import {
  IsString,
  IsOptional,
  IsNumber,
  ValidateNested,
  IsArray,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

class PromotionDto {
  @ApiPropertyOptional({ example: 20 })
  @IsNumber()
  @IsOptional()
  discountPercent?: number;

  @ApiPropertyOptional({ example: '2025-10-01' })
  @IsDateString()
  @IsOptional()
  validUntil?: Date;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Updated Product Title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'Updated product description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'retail', enum: ['retail', 'classified'], description: 'Product Type' })
  type: 'retail' | 'classified';


  @ApiPropertyOptional({ example: 2999 })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ example: 'fashion' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['https://img.com/p3.jpg'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imageUrls?: string[];

  @ApiPropertyOptional({ type: PromotionDto })
  @ValidateNested()
  @Type(() => PromotionDto)
  @IsOptional()
  promotion?: PromotionDto;
}
