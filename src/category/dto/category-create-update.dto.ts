import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

import {
  ApiProperty,
  ApiPropertyOptional,
} from "@nestjs/swagger";

import { CategoryType } from "../schema/category.schema";

class CategoryParameterDto {
  @ApiProperty({ example: "Color" })
  @IsString()
  name!: string;

  @ApiProperty({ example: ["Red", "Blue"], type: [String] })
  @IsArray()
  @IsString({ each: true })
  values!: string[];
}

class CategoryParametersDto {
  @ApiProperty({
    type: [CategoryParameterDto],
    example: [
      { name: "Size", values: ["S", "M", "L"] },
      { name: "Color", values: ["Red", "Blue"] },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryParameterDto)
  en!: CategoryParameterDto[];

  @ApiProperty({
    type: [CategoryParameterDto],
    example: [
      { name: "سائز", values: ["S", "M", "L"] },
      { name: "رنگ", values: ["Red", "Blue"] },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryParameterDto)
  ur!: CategoryParameterDto[];
}

export class CreateUpdateCategoryDto {
  @ApiProperty({
    example: {
      en: "Cleaning",
      ur: "صفائی",
    },
  })
  @IsObject()
  name!: Record<string, string>;

  @ApiPropertyOptional({
    example: {
      en: "Home cleaning and sanitization services",
      ur: "گھر کی صفائی اور جراثیم کش خدمات",
    },
  })
  @IsOptional()
  @IsObject()
  description?: Record<string, string>;

  @ApiPropertyOptional({
    example: {
      en: [
        { name: "Size", values: ["S", "M", "L"] },
        { name: "Color", values: ["Red", "Blue"] },
      ],
      ur: [
        { name: "سائز", values: ["S", "M", "L"] },
        { name: "رنگ", values: ["Red", "Blue"] },
      ],
    },
    type: CategoryParametersDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CategoryParametersDto)
  parameters?: CategoryParametersDto;

  @ApiPropertyOptional({ type: "string", format: "binary" })
  @IsOptional()
  icon?: any;

  @ApiProperty({
    enum: CategoryType,
    example: CategoryType.SERVICE,
  })
  @IsEnum(CategoryType)
  type!: CategoryType;

  @ApiPropertyOptional({
    example: 1,
    description: "Used to control display ordering of categories",
  })
  @IsOptional()
  @IsNumber()
  sortNumber?: number;

  @ApiPropertyOptional({
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isDisabled?: boolean;
}
