import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export const PRODUCT_OFFER_STATUSES = ["pending", "accepted", "declined", "expired"] as const;
export type ProductOfferStatus = (typeof PRODUCT_OFFER_STATUSES)[number];

@Schema({ timestamps: true })
export class ProductOffer extends Document {
  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  product: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  offerer: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  seller: Types.ObjectId;

  @Prop({ type: Number, default: null })
  price: number | null;

  @Prop({ type: String, required: true, maxlength: 1000 })
  message: string;

  @Prop({ type: String, enum: PRODUCT_OFFER_STATUSES, default: "pending" })
  status: ProductOfferStatus;

  @Prop({ type: Date, default: null })
  respondedAt?: Date | null;
}

export const ProductOfferSchema = SchemaFactory.createForClass(ProductOffer);

ProductOfferSchema.index({ product: 1, offerer: 1 });
ProductOfferSchema.index({ seller: 1, status: 1, updatedAt: -1 });
ProductOfferSchema.index({ offerer: 1, updatedAt: -1 });
