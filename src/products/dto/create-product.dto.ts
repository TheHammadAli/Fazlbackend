import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  ValidateNested,
  IsArray,
  IsDateString,
  IsEnum,
  ArrayMaxSize,
  ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Location } from "src/users/schema/users.interfaces";

class ProductParameterDto {
  @ApiProperty({ example: "Color" })
  @IsString()
  name: string;

  @ApiProperty({ example: ["Red", "Blue"], type: [String] })
  @IsArray()
  @IsString({ each: true })
  variants: string[];
}

class LocationDto implements Location {
  @ApiProperty({ enum: ["Point"], example: "Point" })
  @IsEnum(["Point"], { message: 'Location type must be "Point"' })
  type!: "Point";

  @ApiProperty({ example: [73.0479, 33.6844], description: "[lng, lat]" })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  coordinates!: [number, number];
}

export class CreateProductDto {
  @ApiProperty({ example: "Wireless Mouse" })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: "Ergonomic wireless mouse" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 1999 })
  @IsNumber()
  price: number;

  @ApiProperty({ example: "electronics" })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({
    example: "retail",
    enum: ["retail", "classified"],
    description: "Product Type",
  })
  type: "retail" | "classified";

  @ApiPropertyOptional({
    type: [String],
    example: ["https://img.com/p1.jpg", "https://img.com/p2.jpg"],
  })
  @ApiProperty({
    type: "string",
    format: "binary",
    isArray: true,
    description: "Upload multiple images",
  })
  images: any; // NestJS

  @ApiProperty({
    type: "string",
    format: "binary",
    isArray: true,
    description: "Upload One video file",
    maximum: 1,
  })
  @IsNotEmpty()
  video: any;

  @ApiPropertyOptional({
    type: [ProductParameterDto],
    example: [
      { name: "Color", variants: ["Red", "Blue"] },
    ],
    description: "Custom product parameters like size, color, etc.",
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductParameterDto)
  parameters?: ProductParameterDto[];

  @ApiPropertyOptional({
    type: LocationDto,
    description: "Required for personal listings. GeoJSON Point [lng, lat]",
    example: {
      type: "Point",
      coordinates: [67.0011, 24.8607],
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @ApiPropertyOptional({
    example: "House 12, Street 5, DHA Phase 6, Karachi",
    description: "Human-readable address (recommended for personal listings)",
  })
  @IsOptional()
  @IsString()
  address?: string;
}
