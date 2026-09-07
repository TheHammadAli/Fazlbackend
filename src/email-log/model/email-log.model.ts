import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { EmailLog as EmailLogRow } from "../../../generated/prisma/client";

/**
 * Module model file — replaces schema/email-log.schema.ts.
 *
 * One of these per module. It carries the three things the Mongoose schema used
 * to provide, now that the data shape lives in prisma/schema.prisma:
 *
 *   1. the row type, re-exported under the module's own name
 *   2. runtime value arrays for the enums (Prisma enums are types only, so
 *      there is nothing to test membership against at runtime)
 *   3. the Swagger class, since @ApiResponse({ type: ... }) needs a real class
 */

/** The persisted row, as returned by every EmailLogService method. */
export type EmailLog = EmailLogRow;

export const EMAIL_LOG_EVENTS = [
  "shop_created",
  "listing_created",
  "service_created",
  "booking_accepted",
  "broadcast_created",
] as const;
export type EmailLogEvent = (typeof EMAIL_LOG_EVENTS)[number];

export const EMAIL_LOG_STATUSES = ["sent", "failed"] as const;
export type EmailLogStatus = (typeof EMAIL_LOG_STATUSES)[number];

export class EmailLogModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiProperty({ example: "EML-000001", description: "Sequential display code." })
  emailId: string;

  @ApiProperty({ example: "buyer@example.com" })
  recipient: string;

  @ApiPropertyOptional({
    example: "LST-000052",
    description: "Human-readable code of the record the email is about.",
  })
  relatedRecordId?: string | null;

  @ApiProperty({ enum: EMAIL_LOG_EVENTS })
  eventType: EmailLogEvent;

  @ApiProperty({ enum: EMAIL_LOG_STATUSES })
  deliveryStatus: EmailLogStatus;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt: Date;
}
