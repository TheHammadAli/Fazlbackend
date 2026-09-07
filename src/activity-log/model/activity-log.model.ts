import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { ActivityLog as ActivityLogRow } from "../../../generated/prisma/client";

/** Module model file — replaces schema/activity-log.schema.ts. */

export type ActivityLog = ActivityLogRow;

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
  "task_submitted",
  "task_reviewed",
  "admin_password_reset",
] as const;
export type ActivityLogAction = (typeof ACTIVITY_LOG_ACTIONS)[number];

export const ACTIVITY_LOG_TARGET_TYPES = [
  "User",
  "Shop",
  "Product",
  "Broadcast",
  "Task",
] as const;
export type ActivityLogTargetType = (typeof ACTIVITY_LOG_TARGET_TYPES)[number];

/** The actor summary the admin panel reads as `actorInfo` (was a $lookup). */
export class ActivityLogActorModel {
  @ApiProperty()
  id: string;

  @ApiProperty()
  _id: string;

  @ApiPropertyOptional()
  name?: string | null;

  @ApiProperty()
  email: string;
}

export class ActivityLogModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiProperty({ example: 1, description: "Sequential display code." })
  logCode: number;

  @ApiProperty({ enum: ACTIVITY_LOG_ACTIONS })
  action: ActivityLogAction;

  @ApiPropertyOptional({ enum: ACTIVITY_LOG_TARGET_TYPES })
  targetType?: ActivityLogTargetType | null;

  @ApiPropertyOptional({ example: "6a8d9c1828b1818429e64fbb" })
  targetId?: string | null;

  @ApiPropertyOptional()
  details?: string | null;

  @ApiPropertyOptional({ example: "127.0.0.1" })
  ipAddress?: string | null;

  @ApiProperty({ type: ActivityLogActorModel })
  actorInfo: ActivityLogActorModel;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;
}
