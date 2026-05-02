import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import mongoose, { Types } from "mongoose";

export type CategoryRequestDocument = CategoryRequest & Document;

@Schema()
export class CategoryRequest {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true })
  requestedBy: Types.ObjectId;

  @Prop({ enum: ["pending", "approved", "rejected"], default: "pending" })
  status: "pending" | "approved" | "rejected";

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: "User" })
  reviewedBy?: Types.ObjectId;

  @Prop()
  adminComment?: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop()
  reviewedAt?: Date;
}

export const CategoryRequestSchema =
  SchemaFactory.createForClass(CategoryRequest);
