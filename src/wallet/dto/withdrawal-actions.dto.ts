import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsPositive, IsString, MinLength } from "class-validator";

export class RejectWithdrawalDto {
  @ApiProperty({ example: "Bank account details could not be verified" })
  @IsString()
  @MinLength(3)
  reason: string;
}

export class CancelWithdrawalDto {
  @ApiProperty({ example: "Merchant requested cancellation" })
  @IsString()
  @MinLength(3)
  reason: string;
}

export class CompleteWithdrawalDto {
  @ApiPropertyOptional({ example: 1500, description: "Informational only — never deducted by Fazl" })
  @IsOptional()
  @IsInt()
  @IsPositive()
  externalFeeAmountMinor?: number;

  @ApiPropertyOptional({ example: "Bank transfer fee charged by HBL" })
  @IsOptional()
  @IsString()
  externalFeeNote?: string;
}
