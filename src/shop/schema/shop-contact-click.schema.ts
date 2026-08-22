import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ShopContactClickDocument = ShopContactClick & Document;

/** One row per (shop, user) pair, ever — existence = "this user has clicked Chat Store for this shop". */
@Schema({ timestamps: true })
export class ShopContactClick {
  @Prop({ type: Types.ObjectId, ref: "Shop", required: true })
  shopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  userId: Types.ObjectId;
}

export const ShopContactClickSchema = SchemaFactory.createForClass(ShopContactClick);

ShopContactClickSchema.index({ shopId: 1, userId: 1 }, { unique: true });
