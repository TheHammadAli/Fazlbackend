import { IsString, MinLength, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RespondReportDto {
  @ApiProperty({
    maxLength: 1000,
    example: "Thanks for flagging this — we're looking into it.",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  response: string;
}
