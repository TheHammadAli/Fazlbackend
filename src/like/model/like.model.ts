import { ApiProperty } from "@nestjs/swagger";
import type { Like as LikeRow } from "../../../generated/prisma/client";

/** Module model file — replaces schema/like.schema.ts. */

/**
 * One row per (user, item) pair, enforced by a unique index.
 *
 * NOTE: there used to be a byte-identical second copy of this schema at
 * src/shared/schema/like.schema.ts, registered under the same model name. It
 * was dead code and has been removed.
 */
export type Like = LikeRow;

export const ITEM_TYPES = ["product", "service"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const OWNER_MODELS = ["Shop", "User"] as const;
export type OwnerModel = (typeof OWNER_MODELS)[number];

/** A like row as returned to callers, with ids as plain strings. */
export interface LikeItem {
  id: string;
  _id: string;
  itemId: string;
  itemType: ItemType;
  ownerModel: OwnerModel;
  createdAt: Date;
}

/** A like with the referenced product/service resolved for rendering. */
export interface PopulatedLikeItem extends LikeItem {
  itemDetails?: any;
}

/** The user summary returned by the admin "who liked this" drill-down. */
export class LikeUserModel {
  @ApiProperty()
  id: string;

  @ApiProperty()
  _id: string;

  @ApiProperty({ required: false })
  name?: string | null;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false })
  image?: string | null;
}

export class LikeModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiProperty({ example: "6a8d9c1828b1818429e64fbb" })
  itemId: string;

  @ApiProperty({ enum: ITEM_TYPES })
  itemType: ItemType;

  @ApiProperty({ enum: OWNER_MODELS })
  ownerModel: OwnerModel;

  @ApiProperty({ type: LikeUserModel })
  user: LikeUserModel;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;
}
