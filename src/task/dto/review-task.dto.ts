import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";

export const REVIEW_DECISIONS = ["completed", "revision"] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

export class ReviewTaskDto {
  @ApiProperty({ enum: REVIEW_DECISIONS, example: "completed" })
  @IsIn(REVIEW_DECISIONS)
  decision: ReviewDecision;

  @ApiPropertyOptional({ example: "Screenshots are missing for the last two shops", description: "Required when decision is 'revision'" })
  @IsString()
  @IsOptional()
  reason?: string;
}
