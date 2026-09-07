import {
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { ReportReason, REPORT_REASONS } from "../model/report.model";

export class UpdateReportDto {
  @ApiPropertyOptional({ enum: REPORT_REASONS })
  @IsOptional()
  @IsIn(REPORT_REASONS)
  reason?: ReportReason;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  details?: string;
}
