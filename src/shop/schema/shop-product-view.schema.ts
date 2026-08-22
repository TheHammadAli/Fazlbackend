import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ShopProductViewDocument = ShopProductView & Document;

/** One row per (shop, user) pair, ever — existence = "this user has opened at least one product from this shop". */
@Schema({ timestamps: true })
export class ShopProductView {
  @Prop({ type: Types.ObjectId, ref: "Shop", required: true })
  shopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  userId: Types.ObjectId;
}

export const ShopProductViewSchema = SchemaFactory.createForClass(ShopProductView);

ShopProductViewSchema.index({ shopId: 1, userId: 1 }, { unique: true });
