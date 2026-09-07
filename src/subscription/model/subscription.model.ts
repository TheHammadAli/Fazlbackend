import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { Subscription as SubscriptionRow } from "../../../generated/prisma/client";

/** Module model file — replaces schema/subscription-schema.ts. */

export type Subscription = SubscriptionRow;

export const SUBSCRIPTION_TARGET_TYPES = ["Product", "Shop"] as const;
export type SubscriptionTargetType = (typeof SUBSCRIPTION_TARGET_TYPES)[number];

export const SUBSCRIPTION_SCREEN_TYPES = ["listing", "feed"] as const;
export type SubscriptionScreenType = (typeof SUBSCRIPTION_SCREEN_TYPES)[number];

export class SubscriptionModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiProperty({ enum: SUBSCRIPTION_TARGET_TYPES })
  targetType: SubscriptionTargetType;

  @ApiProperty({ example: "Featured Listing - 30 days" })
  name: string;

  @ApiProperty({ example: 500, description: "Price in PKR." })
  price: number;

  @ApiProperty({ example: 30 })
  durationInDays: number;

  @ApiPropertyOptional({ enum: SUBSCRIPTION_SCREEN_TYPES, default: "listing" })
  screenType?: SubscriptionScreenType | null;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt: Date;
}
