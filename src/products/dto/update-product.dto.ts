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




class ProductParameterDto {
  @ApiPropertyOptional({ example: 'Color' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: ['Red', 'Blue'] })
  @IsArray()
  @IsString({ each: true })
  variants: string[];
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
    example: ['https://img.com/p1.jpg', 'https://img.com/p2.jpg'],
  })
  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    isArray: true,
    description: 'Upload multiple images',
  })
  images: any; // NestJS

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    isArray: true,
    description: 'Upload One video file',
    maximum: 1
  })

  video: any;


  @ApiPropertyOptional({
    type: [ProductParameterDto],
    example: [
      { name: 'Color', variants: ['Red', 'Blue'] },
      { name: 'Size', variants: ['S', 'M', 'L'] },
    ],
    description: 'Custom product parameters like size, color, etc.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductParameterDto)
  parameters?: ProductParameterDto[];
}
