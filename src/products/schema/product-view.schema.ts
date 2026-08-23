import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

/** One row per (product, user, day) — existence = "this user viewed this product on this day".
 *  Day-level dedup (not lifetime, unlike the click collections) so the two listing-analytics
 *  numbers are genuinely different: "Total Views" = row count (repeat visits on different days
 *  count again), "Unique Visitors" = distinct userId count within this same collection. Still a
 *  pure dedup table, not a raw incrementing counter — a page refresh within the same day never
 *  inflates the count. */
@Schema({ timestamps: true })
export class ProductView {
  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  day: string;
}

export type ProductViewDocument = ProductView & Document;
export const ProductViewSchema = SchemaFactory.createForClass(ProductView);
ProductViewSchema.index({ productId: 1, userId: 1, day: 1 }, { unique: true });
