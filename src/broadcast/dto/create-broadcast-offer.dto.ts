import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsPositive, IsString, MaxLength, MinLength } from "class-validator";

export class CreateBroadcastOfferDto {
  @ApiProperty({ example: "64f0c2abc1234567890abcd" })
  @IsString()
  broadcastId: string;

  @ApiPropertyOptional({ example: 1500 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;

  @ApiProperty({ maxLength: 1000, example: "I can deliver this today, cash on delivery." })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message: string;
}
