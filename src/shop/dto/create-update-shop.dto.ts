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

  @ApiProperty({ example: "Address of shop" })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: "Selling the latest smart gadgets and accessories." })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ example: "New Makki Market" })
  @IsString()
  @IsOptional()
  marketName?: string;

  @ApiPropertyOptional({ example: "Chakwal" })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: "Talagang Road" })
  @IsString()
  @IsOptional()
  area?: string;

  @ApiPropertyOptional({ example: "+923001234567" })
  @IsString()
  @IsOptional()
  contact?: string;

  @ApiPropertyOptional({ example: "689e387f45330caa85c1e19b", description: "Category ObjectId" })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: "689e387f45330caa85c1e19b", description: "Subcategory ObjectId" })
  @IsString()
  @IsOptional()
  subcategory?: string;

  @ApiPropertyOptional({ example: "Mon-Fri, 9:00 AM - 6:00 PM" })
  @IsString()
  @IsOptional()
  openingHours?: string;

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
