import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsPositive, IsString, MinLength } from "class-validator";

export class CreateRefundDto {
  @ApiProperty({ example: "66f0c0f1e1b2c3d4e5f6a7b8" })
  @IsString()
  originalTransactionId: string;

  @ApiProperty({ example: 250000, description: "Amount in minor currency units (paisa)" })
  @IsInt()
  @IsPositive()
  refundAmountMinor: number;

  @ApiProperty({ example: "Item damaged on arrival" })
  @IsString()
  @MinLength(3)
  refundReason: string;
}

export class RejectRefundDto {
  @ApiProperty({ example: "No valid proof of damage provided" })
  @IsString()
  @MinLength(3)
  reason: string;
}
