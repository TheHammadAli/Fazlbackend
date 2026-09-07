import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  Task as TaskRow,
  TaskAssignee as TaskAssigneeRow,
  TaskSubmission as TaskSubmissionRow,
} from "../../../generated/prisma/client";

/** Module model file — replaces schema/task.schema.ts. */

export type Task = TaskRow;
export type TaskAssignee = TaskAssigneeRow;
export type TaskSubmission = TaskSubmissionRow;

export const TASK_PRIORITIES = ["low", "medium", "high"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = [
  "pending",
  "in_progress",
  "submitted",
  "revision",
  "completed",
  "cancelled",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** Statuses a member is allowed to submit work from. */
export const SUBMITTABLE_STATUSES = ["pending", "in_progress", "revision"] as const;

/** One file attached to a task or a submission. Stored as JSONB — nothing queries an individual attachment. */
export interface TaskAttachment {
  url: string;
  name: string;
}

export class TaskUserModel {
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

export class TaskSubmissionModel {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: "Finished the first pass" })
  notes: string;

  @ApiPropertyOptional()
  link?: string | null;

  @ApiProperty({ type: [Object], example: [{ url: "https://...", name: "spec.pdf" }] })
  attachments: TaskAttachment[];

  @ApiProperty({ type: TaskUserModel })
  submittedBy: TaskUserModel;

  @ApiProperty({ type: String, format: "date-time" })
  submittedAt: Date;
}

export class TaskModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiProperty({ example: "Review the new listing flow" })
  title: string;

  @ApiPropertyOptional()
  description?: string | null;

  /**
   * Flattened from the task_assignees junction table so the response keeps the
   * shape the admin panel already reads: a plain array of users.
   */
  @ApiProperty({ type: [TaskUserModel] })
  assignees: TaskUserModel[];

  @ApiProperty({ enum: TASK_PRIORITIES, default: "medium" })
  priority: TaskPriority;

  @ApiProperty({ enum: TASK_STATUSES, default: "pending" })
  status: TaskStatus;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  dueDate?: Date | null;

  @ApiProperty({ type: TaskUserModel })
  createdBy: TaskUserModel;

  @ApiProperty({ type: [Object] })
  attachments: TaskAttachment[];

  @ApiProperty({ type: [TaskSubmissionModel] })
  submissions: TaskSubmissionModel[];

  @ApiPropertyOptional({ description: "Latest admin revision reason." })
  revisionReason?: string | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt: Date;
}
