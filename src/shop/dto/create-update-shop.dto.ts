import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsNumber,
  IsOptional,
  ValidateNested,
  IsMongoId,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

class LocationDto {
  @ApiProperty({ enum: ["Point"], example: "Point" })
  @IsEnum(["Point"], { message: 'Location type must be "Point"' })
  type: "Point";

  @ApiProperty({
    example: [73.0479, 33.6844],
    description: "Coordinates in [longitude, latitude] format",
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  coordinates: [number, number];
}

export class CreateUpdateShopDto {
  @ApiProperty({ example: "Smart Tech Store" })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: "Shop #12, Ground Floor, Singapore Plaza" })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: "Selling the latest smart gadgets and accessories." })
  @IsString()
  @IsNotEmpty()
  description: string;

  // ========== NEW FIELDS ==========
  @ApiProperty({
    example: "685c611cbcf37e8c78f97f84",
    description: "Category ID (ObjectId)",
  })
  @IsMongoId()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({
    example: "685c611cbcf37e8c78f97f85",
    description: "Subcategory ID (ObjectId) - optional",
  })
  @IsOptional()
  @IsMongoId()
  subcategory?: string;

  @ApiPropertyOptional({ example: "Singapore Plaza" })
  @IsOptional()
  @IsString()
  marketName?: string;

  @ApiProperty({ example: "Saddar" })
  @IsString()
  @IsNotEmpty()
  area: string;

  @ApiProperty({ example: "Karachi" })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: "+923001234567" })
  @IsString()
  @IsNotEmpty()
  contact: string;

  @ApiPropertyOptional({
    example: "Mon-Sat 10:00 AM - 9:00 PM, Sunday Closed",
  })
  @IsOptional()
  @IsString()
  openingHours?: string;
  // ================================

  @ApiPropertyOptional({
    type: "string",
    format: "binary",
    description: "Upload shop logo image",
  })
  @IsOptional()
  image?: any;

  @ApiPropertyOptional({
    type: "string",
    format: "binary",
    description: "Upload shop banner image",
  })
  @IsOptional()
  banner?: any;

  @ApiProperty({ type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;
}
