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

class CategoryParameterEntryDto {
  @ApiProperty({ example: "Size" })
  @IsString()
  name!: string;

  @ApiProperty({ example: ["S", "M", "L"] })
  @IsArray()
  @IsString({ each: true })
  values!: string[];

  @ApiPropertyOptional({
    example: false,
    description: "Whether listings can skip this parameter. Defaults to required (false).",
  })
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: "Whether the user can type their own value instead of picking from the fixed list. Defaults to false.",
  })
  @IsOptional()
  @IsBoolean()
  allowCustomValue?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: "Whether the user can select more than one value from the list. Defaults to single-select (false).",
  })
  @IsOptional()
  @IsBoolean()
  allowMultiple?: boolean;
}

class CategoryParametersDto {
  @ApiProperty({ type: [CategoryParameterEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryParameterEntryDto)
  en!: CategoryParameterEntryDto[];

  @ApiProperty({ type: [CategoryParameterEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryParameterEntryDto)
  ur!: CategoryParameterEntryDto[];
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
      en: [{ name: "Size", values: ["S", "M", "L"] }, { name: "Color", values: ["Red", "Blue"] }],
      ur: [{ name: "سائز", values: ["S", "M", "L"] }, { name: "رنگ", values: ["Red", "Blue"] }],
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
