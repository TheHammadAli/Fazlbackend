import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export const REPORT_ENTITY_TYPES = [
  "shop",
  "product",
  "service",
  "user",
] as const;
export type ReportEntityType = (typeof REPORT_ENTITY_TYPES)[number];

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

export type ReportDocument = Report & Document;

/** Polymorphic reference by (entityId, entityType) — no Mongoose ref/discriminator, resolved
 *  manually via $lookup against shops/products/services/users, matching the Review/Like/Share
 *  convention already used in this codebase. */
@Schema({ timestamps: true })
export class Report {
  @Prop({ unique: true, sparse: true, required: false })
  reportCode?: string;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  reporterId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  entityId: Types.ObjectId;

  @Prop({ type: String, required: true, enum: REPORT_ENTITY_TYPES })
  entityType: ReportEntityType;

  @Prop({ type: String, required: true, enum: REPORT_REASONS })
  reason: ReportReason;

  @Prop({ type: String, required: true, maxlength: 1000 })
  details: string;

  @Prop({
    type: String,
    required: true,
    enum: REPORT_STATUSES,
    default: "open",
  })
  status: ReportStatus;

  @Prop({ type: Boolean, default: false })
  contentRemoved: boolean;

  @Prop({ type: Types.ObjectId, ref: "User", default: null })
  closedBy?: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  closedAt?: Date | null;

  @Prop({ type: String, maxlength: 1000, default: null })
  adminResponse?: string | null;

  @Prop({ type: Types.ObjectId, ref: "User", default: null })
  respondedBy?: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  respondedAt?: Date | null;
}

export const ReportSchema = SchemaFactory.createForClass(Report);

ReportSchema.index({ reporterId: 1, createdAt: -1 });
ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ entityId: 1, entityType: 1 });
