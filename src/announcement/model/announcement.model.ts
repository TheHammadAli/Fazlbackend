import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  Announcement as AnnouncementRow,
  AnnouncementView as AnnouncementViewRow,
} from "../../../generated/prisma/client";

/** Module model file — replaces schema/announcement.schema.ts and schema/announcement-view.schema.ts. */

export type Announcement = AnnouncementRow;
export type AnnouncementView = AnnouncementViewRow;

export const ANNOUNCEMENT_STATUSES = ["draft", "scheduled", "sent"] as const;
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];

export const ANNOUNCEMENT_PRIORITIES = ["low", "medium", "high"] as const;
export type AnnouncementPriority = (typeof ANNOUNCEMENT_PRIORITIES)[number];

export const STATUS_MESSAGE: Record<string, string> = {
  sent: "Announcement sent successfully",
  scheduled: "Announcement scheduled successfully",
  draft: "Announcement saved as draft",
};

export class AnnouncementViewerModel {
  @ApiProperty()
  id: string;

  @ApiProperty()
  _id: string;

  @ApiPropertyOptional()
  name?: string | null;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  image?: string | null;
}

export class AnnouncementModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiPropertyOptional({ example: "ANN-000001" })
  announcementCode?: string | null;

  @ApiProperty({ example: "Eid sale is live" })
  title: string;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  image?: string | null;

  @ApiPropertyOptional()
  video?: string | null;

  @ApiProperty({
    type: [String],
    description: "Roles to notify, e.g. [\"buyer\",\"seller\"]. Empty means all users.",
  })
  targetAudience: string[];

  @ApiPropertyOptional()
  categoryId?: string | null;

  @ApiPropertyOptional()
  location?: string | null;

  @ApiPropertyOptional()
  ctaLabel?: string | null;

  @ApiPropertyOptional()
  ctaDestination?: string | null;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  scheduledAt?: Date | null;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  expiresAt?: Date | null;

  @ApiPropertyOptional({ enum: ANNOUNCEMENT_PRIORITIES, default: "medium" })
  priority?: AnnouncementPriority | null;

  @ApiProperty({ enum: ANNOUNCEMENT_STATUSES, default: "sent" })
  status: AnnouncementStatus;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  sentAt?: Date | null;

  @ApiProperty()
  createdById: string;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt: Date;
}
