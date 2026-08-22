import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ShopViewDocument = ShopView & Document;

/** One row per (shop, user) pair, ever — existence = "this user has viewed this shop". */
@Schema({ timestamps: true })
export class ShopView {
  @Prop({ type: Types.ObjectId, ref: "Shop", required: true })
  shopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  userId: Types.ObjectId;
}

export const ShopViewSchema = SchemaFactory.createForClass(ShopView);

ShopViewSchema.index({ shopId: 1, userId: 1 }, { unique: true });
