import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class SubmitTaskDto {
  @ApiProperty({ example: "Approved all pending shops and left notes on the two rejected ones" })
  @IsString()
  @IsNotEmpty()
  notes: string;

  @ApiPropertyOptional({ example: "https://drive.google.com/..." })
  @IsString()
  @IsOptional()
  link?: string;

  @ApiPropertyOptional({ type: "array", items: { type: "string", format: "binary" }, description: "Up to 5 attachment files" })
  @IsOptional()
  attachments?: any;
}
