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

import { CategoryType } from "../model/category.model";

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

  @ApiPropertyOptional({
    example: ["toyota", "honda"],
    description:
      "Stable ids parallel to `values`, identical across en/ur. Auto-generated from `values` when omitted but `valuesByParent` is used elsewhere in the category.",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  valueKeys?: string[];

  @ApiPropertyOptional({
    example: "Make",
    description:
      "Name of an earlier parameter in the same locale array whose chosen value narrows this parameter's options.",
  })
  @IsOptional()
  @IsString()
  dependsOn?: string;

  @ApiPropertyOptional({
    example: { toyota: ["Corolla", "Yaris"], honda: ["City", "Civic"] },
    description:
      "Present when dependsOn is set: parent valueKeys entry -> this parameter's values under that parent value. `values` is recomputed from this on every save.",
  })
  @IsOptional()
  @IsObject()
  valuesByParent?: Record<string, string[]>;

  @ApiPropertyOptional({
    example: { toyota: ["corolla", "yaris"], honda: ["city", "civic"] },
    description:
      "Same shape as valuesByParent but holding this parameter's own value keys instead of display text â€” what a further, grandchild parameter resolves against. Auto-generated per bucket when omitted.",
  })
  @IsOptional()
  @IsObject()
  valueKeysByParent?: Record<string, string[]>;
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
      ur: "ØµÙØ§Ø¦ÛŒ",
    },
  })
  @IsObject()
  name!: Record<string, string>;

  @ApiPropertyOptional({
    example: {
      en: "Home cleaning and sanitization services",
      ur: "Ú¯Ú¾Ø± Ú©ÛŒ ØµÙØ§Ø¦ÛŒ Ø§ÙˆØ± Ø¬Ø±Ø§Ø«ÛŒÙ… Ú©Ø´ Ø®Ø¯Ù…Ø§Øª",
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
        { name: "Ø³Ø§Ø¦Ø²", values: ["S", "M", "L"] },
        { name: "Ø±Ù†Ú¯", values: ["Red", "Blue"] },
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

  @ApiPropertyOptional({ example: false, description: "Keeps an unfinished category out of public category lists" })
  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;

  @ApiPropertyOptional({
    example: ["66f1a2b3c4d5e6f7a8b9c0d1", "66f1a2b3c4d5e6f7a8b9c0d2"],
    description:
      "Only used when type = 'shop': ids of the 'product' type categories this shop category groups (e.g. Vehicle -> Car, Bike).",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groupedCategoryIds?: string[];
}
