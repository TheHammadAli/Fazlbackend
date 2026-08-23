import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsPositive, IsString, MinLength } from "class-validator";

export class AdjustBalanceDto {
  @ApiProperty({ example: 50000, description: "Amount in minor currency units (paisa)" })
  @IsInt()
  @IsPositive()
  amountMinor: number;

  @ApiProperty({ example: "Compensation for delayed delivery" })
  @IsString()
  @MinLength(3)
  reason: string;
}
