import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateServiceDto {
  @ApiPropertyOptional({ example: 'Home Cleaning Deluxe' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    example: 'Includes balcony, kitchen, and bathroom cleaning.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 2000 })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ enum: ['hourly', 'fixed'], example: 'fixed' })
  @IsEnum(['hourly', 'fixed'])
  @IsOptional()
  paymentType?: 'hourly' | 'fixed';

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  requiresAppointment?: boolean;

  @ApiPropertyOptional({
    type: [String],
    example: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imageUrls?: string[];

  @ApiPropertyOptional({ example: 'cleaning' })
  @IsString()
  @IsOptional()
  category?: string;
}
