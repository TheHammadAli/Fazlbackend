import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServiceDto {
  @ApiProperty({
    example: 'Home Cleaning',
    description: 'Title of the service',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'https://www.video.mp4.com' })
  @IsString()
  @IsNotEmpty()
  video: string;

  @ApiPropertyOptional({ example: 'We offer deep cleaning for all rooms.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 1500, description: 'Price of the service in PKR' })
  @IsNumber()
  price: number;

  @ApiProperty({ enum: ['hourly', 'fixed'], example: 'hourly' })
  @IsEnum(['hourly', 'fixed'])
  paymentType: 'hourly' | 'fixed';

  @ApiPropertyOptional({ example: true })
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

  @ApiProperty({ example: 'cleaning', description: 'Category ID or slug' })
  @IsString()
  category: string;
}
