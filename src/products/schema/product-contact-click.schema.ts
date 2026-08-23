import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

/** One row per (product, user) pair, ever — existence = "this user has clicked Chat/Message
 *  Seller for this product". Repeat clicks by the same user don't recount. */
@Schema({ timestamps: true })
export class ProductContactClick {
  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  userId: Types.ObjectId;
}

export type ProductContactClickDocument = ProductContactClick & Document;
export const ProductContactClickSchema = SchemaFactory.createForClass(ProductContactClick);
ProductContactClickSchema.index({ productId: 1, userId: 1 }, { unique: true });
