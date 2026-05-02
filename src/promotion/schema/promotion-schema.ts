import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class Promotion extends Document {
  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subscription",
  })
  subscriptionId: Types.ObjectId;

  @Prop({ required: true, enum: ["Product", "Shop", "Service"] })
  targetType: "Product" | "Shop" | "Service";

  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    refPath: "targetType",
  })
  targetId: Types.ObjectId;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({
    default: "active",
    enum: ["active", "expired", "cancelled", "scheduled"],
  })
  status: "active" | "expired" | "cancelled" | "scheduled";

  @Prop({ default: false })
  isAutoRenew?: boolean;

  @Prop({ default: false })
  isInFeed?: boolean;
}

export const PromotionSchema = SchemaFactory.createForClass(Promotion);
export type PromotionDocument = Promotion;
