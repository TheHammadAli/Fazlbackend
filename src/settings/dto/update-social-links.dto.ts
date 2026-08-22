import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class UpdateSocialLinksDto {
  @ApiPropertyOptional({ example: "https://facebook.com/fazl" })
  @IsOptional()
  @IsString()
  facebookUrl?: string;

  @ApiPropertyOptional({ example: "https://x.com/fazl" })
  @IsOptional()
  @IsString()
  twitterUrl?: string;

  @ApiPropertyOptional({ example: "https://threads.net/@fazl" })
  @IsOptional()
  @IsString()
  threadsUrl?: string;

  @ApiPropertyOptional({ example: "https://linkedin.com/company/fazl" })
  @IsOptional()
  @IsString()
  linkedinUrl?: string;
}
