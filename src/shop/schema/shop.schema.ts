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
  image: string;

  @Prop({ required: false, trim: true })
  banner: string;

  @Prop({ required: false, trim: true })
  address: string;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ required: false, trim: true })
  marketName?: string;

  @Prop({ required: false, trim: true })
  city?: string;

  @Prop({ required: false, trim: true })
  area?: string;

  @Prop({ required: false, trim: true })
  contact?: string;

  @Prop({ type: Types.ObjectId, ref: "Category", required: false })
  category?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Category", required: false })
  subcategory?: Types.ObjectId;

  @Prop({ required: false, trim: true })
  openingHours?: string;

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

// Add geospatial index on location
ShopSchema.index({ location: "2dsphere" });
