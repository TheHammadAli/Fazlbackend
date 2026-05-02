import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateUpdateCategoryDto {
  @ApiProperty({ example: "Electronics", description: "Category name" })
  @IsString()
  @IsNotEmpty()
  name: string;
}
