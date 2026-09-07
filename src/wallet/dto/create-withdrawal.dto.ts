import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsNotEmptyObject,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from "class-validator";
import { WITHDRAWAL_METHODS, WithdrawalMethod } from "../model/wallet.model";

export class WithdrawalAccountDetailsDto {
  @ApiProperty({ example: "Ali Raza" })
  @IsString()
  accountTitle: string;

  @ApiProperty({ example: "01234567890123" })
  @IsString()
  accountNumber: string;

  @ApiPropertyOptional({ example: "HBL" })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ example: "PK00HABB0000000000000000" })
  @IsOptional()
  @IsString()
  iban?: string;
}

export class CreateWithdrawalDto {
  @ApiProperty({ example: "66f0c0f1e1b2c3d4e5f6a7b8" })
  @IsString()
  merchantId: string;

  @ApiProperty({ example: 500000, description: "Amount in minor currency units (paisa)" })
  @IsInt()
  @IsPositive()
  requestedAmountMinor: number;

  @ApiProperty({ enum: WITHDRAWAL_METHODS })
  @IsIn(WITHDRAWAL_METHODS)
  withdrawalMethod: WithdrawalMethod;

  @ApiProperty({ type: WithdrawalAccountDetailsDto })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => WithdrawalAccountDetailsDto)
  accountDetails: WithdrawalAccountDetailsDto;
}
