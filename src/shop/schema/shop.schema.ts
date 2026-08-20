import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ShopDocument = Shop & Document;

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Shop {
  @Prop({ unique: true, sparse: true, required: false })
  shopCode?: string;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  ownerId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: false, trim: true })
  image?: string;

  @Prop({ required: false, trim: true })
  banner?: string;

  @Prop({ required: true, trim: true })
  address: string;

  @Prop({ required: true, trim: true })
  description: string;

  // ========== NEW FIELDS ==========
  @Prop({ type: Types.ObjectId, ref: "Category", required: true })
  category: Types.ObjectId;                    // Shop Category (required)

  @Prop({ type: Types.ObjectId, ref: "Category", required: false })
  subcategory?: Types.ObjectId;                // Shop Subcategory (optional)

  @Prop({ required: false, trim: true })
  marketName?: string;                         // e.g. Singapore Plaza

  @Prop({ required: true, trim: true })
  area: string;

  @Prop({ required: true, trim: true })
  city: string;

  @Prop({ required: true, trim: true })
  contact: string;

  @Prop({ required: false, trim: true })
  openingHours?: string;                       // e.g. "Mon-Sat 10:00 AM - 9:00 PM"
  // ================================

  @Prop({ type: Boolean, default: false })
  isDisabled?: boolean;

  @Prop({
    type: {
      type: String,
      enum: ["Point"],
      required: true,
      default: "Point",
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  })
  location: {
    type: "Point";
    coordinates: [number, number];
  };
}

export const ShopSchema = SchemaFactory.createForClass(Shop);

ShopSchema.index({ location: "2dsphere" });
