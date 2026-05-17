import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateServiceDto {
  @ApiPropertyOptional({ example: "Home Cleaning Deluxe" })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    example: "Includes balcony, kitchen, and bathroom cleaning.",
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 2000 })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ enum: ["hourly", "fixed", "call_for_price"], example: "fixed" })
  @IsEnum(["hourly", "fixed", "call_for_price"])
  @IsOptional()
  paymentType?: "hourly" | "fixed" | "call_for_price";

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  requiresAppointment?: boolean;

  @ApiProperty({
    type: "string",
    format: "binary",
    isArray: true,
    description: "Upload multiple images",
  })
  @ApiPropertyOptional()
  images: any; // NestJS

  @ApiProperty({
    type: "string",
    format: "binary",
    isArray: true,
    description: "Upload One video file",
    maximum: 1,
  })
  @ApiPropertyOptional()
  video: any;

  @ApiPropertyOptional({ example: "cleaning" })
  @IsString()
  @IsOptional()
  category?: string;
}
