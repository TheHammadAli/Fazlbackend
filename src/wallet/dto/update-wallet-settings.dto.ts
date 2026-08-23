import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsPositive } from "class-validator";

export class UpdateWalletSettingsDto {
  @ApiPropertyOptional({ example: 10000 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  minTopUpAmountMinor?: number;

  @ApiPropertyOptional({ example: 100000000 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  maxTopUpAmountMinor?: number;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  minWithdrawalAmountMinor?: number;

  @ApiPropertyOptional({ example: 100000000 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  maxWithdrawalAmountMinor?: number;

  @ApiPropertyOptional({ example: 500000000 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  dailyTransactionLimitMinor?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  walletStatus?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  withdrawalStatus?: boolean;
}
