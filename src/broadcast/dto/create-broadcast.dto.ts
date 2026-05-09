import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsEnum,
} from "class-validator";

export class CreateBroadcastDto {
  @ApiProperty({ example: "Need 50kg rice urgently" })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  radius: number;

  @ApiProperty({ example: "66a1b2c3d4e5f67890123456" })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ example: "product", enum: ["product", "service"] })
  @IsEnum(["product", "service"])
  @IsNotEmpty()
  type: "product" | "service";

  @ApiPropertyOptional({
    type: "array",
    items: {
      type: "string",
      format: "binary",
    },
  })
  files?: any[];
}