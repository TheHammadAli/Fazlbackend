import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class ServiceParameterDto {
  @ApiProperty({ example: "Color" })
  @IsString()
  name: string;

  @ApiProperty({ example: ["Red", "Blue"], type: [String] })
  @IsArray()
  @IsString({ each: true })
  variants: string[];
}


export class CreateServiceDto {
  @ApiProperty({
    example: "Home Cleaning",
    description: "Title of the service",
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: "We offer deep cleaning for all rooms." })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 1500,
    description: "Price of the service in PKR. Not required when isVideoPost is true.",
  })
  @ValidateIf((o) => !o.isVideoPost)
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({
    enum: ["hourly", "fixed", "call_for_price"],
    example: "hourly",
    description: "Not required when isVideoPost is true (defaults to 'fixed').",
  })
  @ValidateIf((o) => !o.isVideoPost)
  @IsEnum(["hourly", "fixed", "call_for_price"])
  paymentType?: "hourly" | "fixed" | "call_for_price";

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  requiresAppointment?: boolean;

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
    example: "cleaning",
    description: "Category ID or slug. Not required when isVideoPost is true (an internal 'Video Post' category is used instead).",
  })
  @ValidateIf((o) => !o.isVideoPost)
  @IsString()
  @IsNotEmpty()
  category?: string;

  @ApiPropertyOptional({
    example: false,
    description: "Lightweight post: just a video + title/caption, no category/price required. A provider can post any number of these even though a real service is capped at one.",
  })
  @IsOptional()
  @IsBoolean()
  isVideoPost?: boolean;

  @ApiPropertyOptional({
    example: "6a8d9c1828b1818429e64faa",
    description: "Only meaningful on a video post: id of one of the same provider's own real listings to promote. Optional.",
  })
  @IsOptional()
  @IsString()
  taggedProductId?: string;

  @ApiPropertyOptional({
    type: [ServiceParameterDto],
    example: [
      { name: "Color", variants: ["Red", "Blue"] },
    ],
    description: "Custom service parameters like size, color, etc.",
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceParameterDto)
  parameters?: ServiceParameterDto[];
}
