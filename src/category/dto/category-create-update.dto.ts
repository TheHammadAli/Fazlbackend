import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
} from "class-validator";

import {
  ApiProperty,
  ApiPropertyOptional,
} from "@nestjs/swagger";

import { CategoryType } from "../schema/category.schema";

export class CreateUpdateCategoryDto {
  @ApiProperty({
    example: {
      en: "Cleaning",
      ur: "صفائی",
    },
  })
  @IsObject()
  name: Record<string, string>;

  @ApiProperty({
    enum: CategoryType,
    example: CategoryType.SERVICE,
  })
  @IsEnum(CategoryType)
  type: CategoryType;

  @ApiPropertyOptional({
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isDisabled?: boolean;
}