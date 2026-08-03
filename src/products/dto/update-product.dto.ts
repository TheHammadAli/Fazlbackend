import {
  IsString,
  IsOptional,
  IsNumber,
  ValidateNested,
  IsArray,
  IsDateString,
  IsObject,
  IsEnum,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

class ProductParameterDto {
  @ApiPropertyOptional({ example: "Color" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: ["Red", "Blue"] })
  @IsArray()
  @IsString({ each: true })
  variants: string[];
}

class LocationDto {
  @ApiPropertyOptional({ example: "Point" })
  @IsString()
  type: "Point";

  @ApiPropertyOptional({ example: [73.066722, 31.467132] })
  @IsArray()
  @IsNumber({}, { each: true })
  coordinates: [number, number];
}

export class UpdateProductDto {
  @ApiPropertyOptional({ example: "Updated Product Title" })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: "Updated product description" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: "retail",
    enum: ["retail", "classified"],
    description: "Product Type",
  })
  @IsOptional()
  @IsEnum(["retail", "classified"])
  type?: "retail" | "classified";

  @ApiPropertyOptional({ example: 2999 })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ example: "fashion" })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    type: "string",
    format: "binary",
    isArray: true,
    description: "Upload multiple images",
  })
  @IsOptional()
  images?: any;

  @ApiPropertyOptional({
    type: "string",
    format: "binary",
    description: "Upload one video file",
  })
  @IsOptional()
  video?: any;

  @ApiPropertyOptional({
    type: [ProductParameterDto],
    example: [{ name: "Color", variants: ["Red", "Blue"] }],
    description: "Custom product parameters like size, color, etc.",
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductParameterDto)
  parameters?: ProductParameterDto[];

  // ---------- NEW FIELDS ----------
  @ApiPropertyOptional({
    description: "GeoJSON Point location. Can be sent as object or as JSON string.",
    example: {
      type: "Point",
      coordinates: [73.066722, 31.467132],
    },
  })
  @IsOptional()
  location?: LocationDto | string; // accept both object and string (because of form-data)

  @ApiPropertyOptional({
    example: "Ismail City Faisalabad",
    description: "Human readable address",
  })
  @IsOptional()
  @IsString()
  address?: string;
  // --------------------------------
}