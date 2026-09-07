import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { Promotion as PromotionRow } from "../../../generated/prisma/client";

/** Module model file — replaces schema/promotion-schema.ts. */

/**
 * The API shape: the stored row plus the collapsed `targetId`.
 *
 * Storage splits that polymorphic reference into three typed foreign keys
 * (product_id / shop_id / service_id) guarded by a CHECK constraint, so a
 * promotion can no longer point at something that does not exist. Clients still
 * see one `targetId`, exactly as before.
 */
export type Promotion = PromotionRow & { targetId: string | null };

export const PROMOTION_TARGET_TYPES = ["Product", "Shop", "Service"] as const;
export type PromotionTargetType = (typeof PROMOTION_TARGET_TYPES)[number];

/** The subset the create endpoint has ever accepted. */
export const PROMOTION_CREATABLE_TARGET_TYPES = ["Product", "Shop"] as const;

export const PROMOTION_STATUSES = [
  "active",
  "expired",
  "cancelled",
  "scheduled",
] as const;
export type PromotionStatus = (typeof PROMOTION_STATUSES)[number];

export class PromotionModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiProperty({ example: "6a8d9c1828b1818429e64fbb" })
  subscriptionId: string;

  @ApiProperty({ enum: PROMOTION_TARGET_TYPES })
  targetType: PromotionTargetType;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "Id of the promoted product, shop or service.",
  })
  targetId: string | null;

  @ApiProperty({ type: String, format: "date-time" })
  startDate: Date;

  @ApiProperty({ type: String, format: "date-time" })
  endDate: Date;

  @ApiProperty({ enum: PROMOTION_STATUSES })
  status: PromotionStatus;

  @ApiPropertyOptional({ default: false })
  isAutoRenew?: boolean;

  @ApiPropertyOptional({ default: false })
  isInFeed?: boolean;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt: Date;
}
