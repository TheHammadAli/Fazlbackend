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

export const CATEGORY_TYPES = ["service", "product", "shop"] as const;

export const CATEGORY_REQUEST_STATUSES = ["pending", "approved", "rejected"] as const;
export type CategoryRequestStatus = (typeof CATEGORY_REQUEST_STATUSES)[number];

/** Name of the hidden sentinel category used by lightweight video posts. */
export const VIDEO_POST_CATEGORY_NAME = "Video Post";

/** One localised parameter definition inside `Category.parameters`. */
export interface CategoryParameter {
  name: string;
  /**
   * The full option list. On a dependent parameter (see `dependsOn`) this is
   * a server-recomputed union of every `valuesByParent` list — never a value
   * a client can set directly — kept so an old client that has never heard of
   * `dependsOn` still gets a usable (if unfiltered) list instead of an empty,
   * unfillable field.
   */
  values: string[];
  isOptional?: boolean;
  allowCustomValue?: boolean;
  allowMultiple?: boolean;
  /**
   * Stable ids parallel to `values`, e.g. `values: ["Toyota","Honda"]` →
   * `valueKeys: ["toyota","honda"]`. Identical across `en`/`ur` so a value's
   * display text can be translated without touching what addresses it.
   * Present only once some parameter in the category actually depends on
   * another.
   */
  valueKeys?: string[];
  /**
   * Name of an earlier entry in the SAME locale array whose chosen value
   * narrows this parameter's options. "Earlier" is enforced on write, which
   * is what makes a dependency cycle unrepresentable.
   */
  dependsOn?: string;
  /**
   * Present when `dependsOn` is set: parent `valueKeys` entry → the list of
   * this parameter's values available under that parent value.
   */
  valuesByParent?: Record<string, string[]>;
  /**
   * Present when `dependsOn` is set: the same keys as `valuesByParent`, but
   * mapping to THIS parameter's own value keys instead of display text —
   * parallel array, same length, per bucket.
   *
   * This is what a grandchild parameter (e.g. Variant, depending on Model,
   * which itself depends on Make) has to resolve against instead of the flat
   * `valueKeys`: once a cascade narrows Model's shown options down to one
   * Make's models, "Vitz"'s position *within that narrowed list* has nothing
   * to do with its position in the full `valueKeys` array — using the flat
   * array there silently returns a different model's key for every Make
   * except whichever one happens to occupy the first slots. Looking the key
   * up in the same bucket the option list itself came from is what keeps the
   * two aligned regardless of how many other makes/models exist before it.
   */
  valueKeysByParent?: Record<string, string[]>;
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
