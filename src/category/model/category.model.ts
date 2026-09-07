import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  Category as CategoryRow,
  CategoryRequest as CategoryRequestRow,
} from "../../../generated/prisma/client";

/** Module model file — replaces schema/category.schema.ts and schema/category-request.schema.ts. */

export type Category = CategoryRow;
export type CategoryRequest = CategoryRequestRow;

/**
 * Kept as a real enum object because existing code imports and dereferences it
 * (e.g. CategoryType.PRODUCT), which a Prisma type alone cannot provide.
 */
export enum CategoryType {
  SERVICE = "service",
  PRODUCT = "product",
}

export const CATEGORY_TYPES = ["service", "product"] as const;

export const CATEGORY_REQUEST_STATUSES = ["pending", "approved", "rejected"] as const;
export type CategoryRequestStatus = (typeof CATEGORY_REQUEST_STATUSES)[number];

/** Name of the hidden sentinel category used by lightweight video posts. */
export const VIDEO_POST_CATEGORY_NAME = "Video Post";

/** One localised parameter definition inside `Category.parameters`. */
export interface CategoryParameter {
  name: string;
  values: string[];
  isOptional?: boolean;
  allowCustomValue?: boolean;
  allowMultiple?: boolean;
}

/**
 * `parameters` is stored as JSONB: read and written whole, per locale, never
 * queried by inner field, and deeply irregular in shape. A table here would buy
 * nothing and cost a join on every category read.
 */
export interface CategoryParameters {
  en: CategoryParameter[];
  ur: CategoryParameter[];
}

/** Locale-keyed text, e.g. { en: "Electronics", ur: "الیکٹرانکس" }. */
export type LocalizedText = Record<string, string>;

export class CategoryModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiProperty({
    description:
      "Locale-keyed name. Admin endpoints return the whole map; user-facing endpoints return the single resolved string for the request locale.",
    example: { en: "Electronics", ur: "الیکٹرانکس" },
  })
  name: LocalizedText | string;

  @ApiPropertyOptional({ example: { en: "Phones, laptops", ur: "" } })
  description?: LocalizedText | string | null;

  @ApiPropertyOptional({
    description: "Per-locale parameter definitions used by listing forms.",
    example: { en: [{ name: "Color", values: ["Red", "Blue"] }], ur: [] },
  })
  parameters?: CategoryParameters;

  @ApiProperty({ example: 0 })
  sortNumber: number;

  @ApiProperty({ default: false })
  isDisabled: boolean;

  @ApiPropertyOptional()
  icon?: string | null;

  @ApiProperty({ enum: CATEGORY_TYPES })
  type: string;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt: Date;
}

export class CategoryRequestModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiProperty({ example: "Vintage Furniture" })
  name: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty({ example: "6a8d9c1828b1818429e64fbb" })
  requestedById: string;

  @ApiProperty({ enum: CATEGORY_REQUEST_STATUSES, default: "pending" })
  status: CategoryRequestStatus;

  @ApiPropertyOptional()
  reviewedById?: string | null;

  @ApiPropertyOptional()
  adminComment?: string | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  reviewedAt?: Date | null;
}
