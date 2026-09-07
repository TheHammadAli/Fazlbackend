import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { Report as ReportRow } from "../../../generated/prisma/client";

/** Module model file — replaces schema/report.schema.ts. */

export type Report = ReportRow;

export const REPORT_ENTITY_TYPES = ["shop", "product", "service", "user"] as const;
export type ReportEntityType = (typeof REPORT_ENTITY_TYPES)[number];

/**
 * Wire values. "Adult Content" is not a legal Prisma identifier, so the Prisma
 * enum member is `AdultContent` with an @map — see common/utils/enum-wire.util.
 */
export const REPORT_REASONS = [
  "Spam",
  "Adult Content",
  "Fraud",
  "Duplicate",
  "Other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_STATUSES = ["open", "closed"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

/** Which table each entityType resolves against for the reported item's title. */
export const REPORT_ENTITY_TABLES: Record<ReportEntityType, string> = {
  shop: "shops",
  product: "products",
  service: "services",
  user: "users",
};

export class ReportReporterModel {
  @ApiProperty()
  _id: string;

  @ApiPropertyOptional()
  name?: string | null;

  @ApiProperty()
  email: string;
}

export class ReportModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiPropertyOptional({ example: "REP-000001" })
  reportCode?: string | null;

  @ApiProperty({ example: "6a8d9c1828b1818429e64fbb" })
  entityId: string;

  @ApiProperty({ enum: REPORT_ENTITY_TYPES })
  entityType: ReportEntityType;

  @ApiPropertyOptional({
    description: "Resolved title/name of the reported entity, joined at read time.",
  })
  entityTitle?: string | null;

  @ApiProperty({ enum: REPORT_REASONS })
  reason: ReportReason;

  @ApiProperty()
  details: string;

  @ApiProperty({ enum: REPORT_STATUSES, default: "open" })
  status: ReportStatus;

  @ApiProperty({ default: false })
  contentRemoved: boolean;

  @ApiPropertyOptional()
  adminResponse?: string | null;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  respondedAt?: Date | null;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  closedAt?: Date | null;

  @ApiProperty({ type: ReportReporterModel })
  reporter: ReportReporterModel;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;
}

/** One row of the admin Reports list, as returned by ReportRepository. */
export interface AdminReportRow {
  _id: string;
  id: string;
  reportCode: string | null;
  entityId: string;
  entityType: ReportEntityType;
  entityTitle: string | null;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  contentRemoved: boolean;
  adminResponse: string | null;
  respondedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  reporter: { _id: string; id: string; name: string | null; email: string } | null;
}
