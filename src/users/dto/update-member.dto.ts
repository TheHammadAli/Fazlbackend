import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString } from "class-validator";

export class UpdateMemberDto {
  @ApiPropertyOptional({ example: "Bilal Ahmed" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: "bilal@fazl.com" })
  @IsEmail()
  @IsOptional()
  email?: string;
}
