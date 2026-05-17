import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

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

  @ApiProperty({ example: 1500, description: "Price of the service in PKR" })
  @IsNumber()
  price: number;

  @ApiProperty({ enum: ["hourly", "fixed", "call_for_price"], example: "hourly" })
  @IsEnum(["hourly", "fixed", "call_for_price"])
  paymentType: "hourly" | "fixed" | "call_for_price";

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

  @ApiProperty({ example: "cleaning", description: "Category ID or slug" })
  @IsString()
  category: string;
}
