import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ShopWhatsappClickDocument = ShopWhatsappClick & Document;

/** One row per (shop, user) pair, ever — existence = "this user has clicked WhatsApp for this shop". */
@Schema({ timestamps: true })
export class ShopWhatsappClick {
  @Prop({ type: Types.ObjectId, ref: "Shop", required: true })
  shopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  userId: Types.ObjectId;
}

export const ShopWhatsappClickSchema = SchemaFactory.createForClass(ShopWhatsappClick);

ShopWhatsappClickSchema.index({ shopId: 1, userId: 1 }, { unique: true });
