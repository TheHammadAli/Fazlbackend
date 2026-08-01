import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export const TASK_PRIORITIES = ["low", "medium", "high"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

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
}

export type TaskDocument = Task & Document;
export const TaskSchema = SchemaFactory.createForClass(Task);
