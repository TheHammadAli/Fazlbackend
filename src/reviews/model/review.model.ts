import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { Review as ReviewRow } from "../../../generated/prisma/client";

/** Module model file — replaces schema/review.schema.ts. */

export type Review = ReviewRow;

export const ITEM_TYPES = ["product", "service"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const MIN_RATING = 1;
export const MAX_RATING = 5;

export class ReviewerModel {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  name?: string | null;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  image?: string | null;
}

export class ReviewModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiProperty({ example: "6a8d9c1828b1818429e64fbb" })
  itemId: string;

  @ApiProperty({ enum: ITEM_TYPES })
  itemType: ItemType;

  @ApiPropertyOptional({
    description:
      "Set when the review is scoped to one booking rather than the item overall, so a service booked more than once can be reviewed per booking.",
  })
  requestId?: string | null;

  @ApiProperty({ minimum: MIN_RATING, maximum: MAX_RATING, example: 5 })
  rating: number;

  @ApiPropertyOptional()
  comment?: string | null;

  @ApiProperty({ default: false })
  isFlagged: boolean;

  @ApiProperty({ type: ReviewerModel })
  reviewer: ReviewerModel;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;
}

/** One row of the admin Reviews list, as returned by ReviewRepository. */
export interface AdminReviewRow {
  _id: string;
  id: string;
  itemId: string;
  itemType: ItemType;
  itemTitle: string | null;
  requestId: string | null;
  rating: number;
  comment: string | null;
  isFlagged: boolean;
  createdAt: Date;
  reviewer: { _id: string; id: string; name: string | null; email: string } | null;
}

/** Aggregate rating for one item. `_id` is kept as the key because callers index by it. */
export interface ItemRatingSummary {
  _id: string;
  avgRating: number;
  count: number;
}
