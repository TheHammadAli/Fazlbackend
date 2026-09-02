import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsPositive, IsString, MaxLength, MinLength } from "class-validator";

export class CreateProductOfferDto {
  @ApiProperty({ example: "64f0c2abc1234567890abcd" })
  @IsString()
  productId: string;

  @ApiProperty({ example: 1500 })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({ maxLength: 1000, example: "Would you take 1500 for this?" })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message: string;
}
