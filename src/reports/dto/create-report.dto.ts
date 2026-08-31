import { IsIn, IsString, MinLength, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { ReportReason, REPORT_REASONS } from "../schema/report.schema";

export class CreateReportDto {
  @ApiProperty({ example: "64f0c2abc1234567890abcd" })
  @IsString()
  entityId: string;

  // Deliberately narrower than the schema's REPORT_ENTITY_TYPES — "user" (report-a-user) is out
  // of scope for this pass since no Report button is being added to any user-profile page.
  @ApiProperty({ enum: ["shop", "product", "service"], example: "product" })
  @IsIn(["shop", "product", "service"])
  entityType: "shop" | "product" | "service";

  @ApiProperty({ enum: REPORT_REASONS, example: "Spam" })
  @IsIn(REPORT_REASONS)
  reason: ReportReason;

  @ApiProperty({
    maxLength: 1000,
    example: "This shop keeps reposting the same listing.",
  })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  details: string;
}
