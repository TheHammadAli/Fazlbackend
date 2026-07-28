import { IsBoolean } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateProductStatusDto {
  @ApiProperty({ example: true, description: "Set to true to disable the product, false to enable" })
  @IsBoolean()
  isDisabled: boolean;
}
