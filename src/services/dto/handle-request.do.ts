import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsDateString } from "class-validator";

export class HandleRequestDto {
  @ApiProperty({
    enum: [
      "create",
      "accept",
      "reject",
      "propose",
      "confirm",
      "cancel",
      "start_job",
      "complete_job",
      "verify_job",
      "dispute_job",
    ],
  })
  @IsEnum([
    "create",
    "accept",
    "reject",
    "propose",
    "confirm",
    "cancel",
    "start_job",
    "complete_job",
    "verify_job",
    "dispute_job",
  ])
  action: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requestId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerId?: string;

  @ApiPropertyOptional({ example: "2025-07-01T15:00:00Z" })
  @IsOptional()
  @IsDateString()
  requestedDateTime?: string;

  @ApiPropertyOptional({ example: "2025-07-01T18:00:00Z" })
  @IsOptional()
  @IsDateString()
  proposedDateTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;
}
