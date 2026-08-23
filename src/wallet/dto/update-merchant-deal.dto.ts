import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class UpdateMerchantDealDto {
  @ApiProperty({ example: 12, description: "Percent discount the customer sees" })
  @IsNumber()
  @Min(0)
  @Max(100)
  customerDiscountPercent: number;

  @ApiProperty({ example: 8, description: "Percent margin Fazl keeps" })
  @IsNumber()
  @Min(0)
  @Max(100)
  fazlMarginPercent: number;

  @ApiPropertyOptional({ example: "Renegotiated quarterly deal" })
  @IsOptional()
  @IsString()
  reason?: string;
}
