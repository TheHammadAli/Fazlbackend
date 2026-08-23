import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class FreezeWalletDto {
  @ApiProperty({ example: "Suspicious activity reported by user" })
  @IsString()
  @MinLength(3)
  reason: string;
}
