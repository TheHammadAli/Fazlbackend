import { ApiProperty } from "@nestjs/swagger";
import type { Share as ShareRow } from "../../../generated/prisma/client";

/** Module model file — replaces schema/share.schema.ts. */

/** One row per (user, item) pair, ever — existence means "this user has shared this item". */
export type Share = ShareRow;

export const ITEM_TYPES = ["product", "service"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

/** The user summary returned by the admin "who shared this" drill-down. */
export class ShareUserModel {
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

export class ShareModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiProperty({ example: "6a8d9c1828b1818429e64fbb" })
  itemId: string;

  @ApiProperty({ enum: ITEM_TYPES })
  itemType: ItemType;

  @ApiProperty({ type: ShareUserModel })
  user: ShareUserModel;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;
}
