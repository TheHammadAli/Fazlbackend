import { IsOptional, IsString, MinLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class ResetMemberPasswordDto {
  @ApiPropertyOptional({
    example: "Kj8#mPz2Qx",
    description: "New password to set. Omit to auto-generate one server-side.",
  })
  @IsString()
  @IsOptional()
  @MinLength(8)
  newPassword?: string;
}
