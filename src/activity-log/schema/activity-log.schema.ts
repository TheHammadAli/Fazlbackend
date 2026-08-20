import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export const ACTIVITY_LOG_ACTIONS = [
  "admin_login",
  "admin_logout",
  "user_suspended",
  "user_enabled",
  "user_updated",
  "shop_suspended",
  "shop_enabled",
  "listing_suspended",
  "listing_enabled",
  "listing_deleted",
  "broadcast_deleted",
  "member_created",
  "member_updated",
  "member_deleted",
  "member_password_reset",
  "task_created",
  "task_assigned",
  "task_updated",
  "task_deleted",
  "admin_password_reset",
] as const;
export type ActivityLogAction = (typeof ACTIVITY_LOG_ACTIONS)[number];

@Schema({ timestamps: true })
export class ActivityLog {
  @Prop({ required: true })
  logCode!: number;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  actor!: Types.ObjectId;

  @Prop({ type: String, enum: ACTIVITY_LOG_ACTIONS, required: true })
  action!: ActivityLogAction;

  @Prop({ type: String, enum: ["User", "Shop", "Product", "Broadcast", "Task"] })
  targetType?: string;

  @Prop({ type: Types.ObjectId })
  targetId?: Types.ObjectId;

  @Prop({ type: String })
  details?: string;

  @Prop({ type: String })
  ipAddress?: string;
}

export type ActivityLogDocument = ActivityLog & Document;
export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);
