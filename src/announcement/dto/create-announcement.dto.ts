import { IsArray, IsDateString, IsEnum, IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateAnnouncementDto {
  @ApiProperty({ example: "New feature: Echo Broadcasts" })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: "You can now message nearby sellers directly from the app!" })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ type: "string", format: "binary" })
  @IsOptional()
  image?: any;

  @ApiPropertyOptional({ example: ["buyer", "seller"], description: "Empty/omitted means all users" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetAudience?: string[];

  @ApiPropertyOptional({ example: "66f1a2b3c4d5e6f7a8b9c0d1" })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: "Lahore, Gulberg" })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: "View Offer" })
  @IsOptional()
  @IsString()
  ctaLabel?: string;

  @ApiPropertyOptional({ example: "listing/6a1b2c3d4e5f" })
  @IsOptional()
  @IsString()
  ctaDestination?: string;

  @ApiPropertyOptional({ example: "2026-08-10T09:00:00.000Z" })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ example: "2026-08-20T09:00:00.000Z" })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ enum: ["low", "medium", "high"], example: "medium" })
  @IsOptional()
  @IsEnum(["low", "medium", "high"])
  priority?: "low" | "medium" | "high";

  @ApiPropertyOptional({ enum: ["draft", "scheduled", "sent"], example: "sent" })
  @IsOptional()
  @IsIn(["draft", "scheduled", "sent"])
  status?: "draft" | "scheduled" | "sent";
}
