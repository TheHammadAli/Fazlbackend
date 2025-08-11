import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Product {
  @Prop({ type: Types.ObjectId, ref: 'Shop', required: false })
  shopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  ownerId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  description: string;

  @Prop({ required: true })
  price: number;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  category: Types.ObjectId

  @Prop({
    type: {
      discountPercent: { type: Number, required: true },
      validUntil: { type: Date, required: true },
    },
    required: false,
    _id: false,
  })
  promotion?: {
    discountPercent: number;
    validUntil: Date;
  };

  @Prop({ type: String, enum: ['retail', 'classified'], required: true })
  type: 'retail' | 'classified';

  @Prop({ type: [String], default: [] })
  imageUrls: string[];
  @Prop({ required: true, trim: true })
  video: string;

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  })
  location: {
    type: 'Point';
    coordinates: [number, number];
  };

   @Prop({
    type: [
      {
        name: { type: String, required: true },
        variants: { type: [String], default: [] },
      },
    ],
    default: [],
    required: false,
  })
  parameters?: Array<{
    name: string;
    variants: string[];
  }>;

}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ location: '2dsphere' });

export type ProductDocument = Product & Document;
