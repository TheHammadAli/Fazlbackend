import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

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

/** One member submission of work on a task; kept as a timeline so revision history survives resubmits. */
@Schema({ _id: false, timestamps: false })
export class TaskSubmissionEntry {
  @Prop({ required: true, trim: true })
  notes: string;

  @Prop({ required: false, trim: true })
  link?: string;

  @Prop({
    type: [{ url: { type: String, required: true }, name: { type: String, required: true }, _id: false }],
    default: [],
  })
  attachments: { url: string; name: string }[];

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  submittedBy: Types.ObjectId;

  @Prop({ type: Date, required: true })
  submittedAt: Date;
}

export const TaskSubmissionEntrySchema = SchemaFactory.createForClass(TaskSubmissionEntry);

@Schema({ timestamps: true })
export class Task {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: false, trim: true })
  description?: string;

  /** Members this task is assigned to; at least one is required. */
  @Prop({ type: [Types.ObjectId], ref: "User", required: true })
  assignees: Types.ObjectId[];

  @Prop({ type: String, enum: TASK_PRIORITIES, default: "medium" })
  priority: TaskPriority;

  @Prop({ type: String, enum: TASK_STATUSES, default: "pending" })
  status: TaskStatus;

  @Prop({ type: Date, required: false })
  dueDate?: Date;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: [TaskSubmissionEntrySchema], default: [] })
  submissions: TaskSubmissionEntry[];

  /** Latest admin revision reason; set on "revision" review, cleared on resubmit/approve. */
  @Prop({ required: false, trim: true })
  revisionReason?: string;
}

export type TaskDocument = Task & Document;
export const TaskSchema = SchemaFactory.createForClass(Task);
