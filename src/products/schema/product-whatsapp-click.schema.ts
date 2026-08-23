import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

/** One row per (product, user) pair, ever — existence = "this user has clicked WhatsApp for
 *  this product". Repeat clicks by the same user don't recount. */
@Schema({ timestamps: true })
export class ProductWhatsappClick {
  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  userId: Types.ObjectId;
}

export type ProductWhatsappClickDocument = ProductWhatsappClick & Document;
export const ProductWhatsappClickSchema = SchemaFactory.createForClass(ProductWhatsappClick);
ProductWhatsappClickSchema.index({ productId: 1, userId: 1 }, { unique: true });
