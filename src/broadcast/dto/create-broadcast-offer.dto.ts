import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsPositive, IsString, MaxLength, MinLength } from "class-validator";

export class CreateBroadcastOfferDto {
  @ApiProperty({ example: "64f0c2abc1234567890abcd" })
  @IsString()
  broadcastId: string;

  @ApiProperty({ example: 1500 })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({ maxLength: 1000, example: "I can deliver this today, cash on delivery." })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message: string;
}
