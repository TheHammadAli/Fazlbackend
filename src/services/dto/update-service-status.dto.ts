import { IsBoolean } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateServiceStatusDto {
  @ApiProperty({ example: true, description: "Set to true to disable the service, false to enable" })
  @IsBoolean()
  isDisabled: boolean;
}
