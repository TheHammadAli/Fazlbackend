import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { Notification as NotificationRow } from "../../../generated/prisma/client";

/** Module model file — replaces schema/notifications.schema.ts. */

export type Notification = NotificationRow;

/**
 * The Mongoose schema kept this list duplicated between a TypeScript union and
 * an `enum:` array, with a comment noting they were held in step by hand. There
 * is now one list here, and one Postgres enum generated from it.
 */
export const NOTIFICATION_TYPES = [
  "ORDER",
  "MESSAGE",
  "PROMOTION",
  "SERVICE_REQUEST",
  "BROADCAST",
  "ANNOUNCEMENT",
  "LIKE",
  "REPORT",
  "PRODUCT_OFFER",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export class NotificationModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiProperty({ example: "6a8d9c1828b1818429e64fbb", description: "Recipient." })
  userId: string;

  @ApiProperty({ enum: NOTIFICATION_TYPES })
  type: NotificationType;

  @ApiProperty({ example: "Someone liked your listing" })
  message: string;

  @ApiPropertyOptional({
    description: "Free-form per notification type; the shape differs across all nine.",
  })
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      "Flat scalars only — a tapped tray notification arrives as a flat object of strings on the device.",
  })
  payload?: Record<string, unknown>;

  @ApiProperty({ default: false })
  read: boolean;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt: Date;
}
