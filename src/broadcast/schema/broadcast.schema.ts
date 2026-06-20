import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type BroadcastDocument = HydratedDocument<Broadcast>;

@Schema({ timestamps: true })
export class Broadcast {
  @Prop({ type: Types.ObjectId, required: true, ref: "User" })
  buyer: Types.ObjectId;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: String })
  address?: string;

  @Prop({ type: String, enum: ["Buying", "Selling"], required: true })
  purpose: "Buying" | "Selling";

  @Prop({ type: Types.ObjectId, ref: "Category" })
  category: Types.ObjectId;

  @Prop({ type: Number, required: true })
  radius: number;
  

  @Prop({
    type: {
      type: String,
      enum: ["Point"],
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

  @Prop({ type: String, enum: ["product", "service"], required: true })
  type: "product" | "service";

  @Prop({ type: Date })
  expiresAt: Date;

  @Prop({ type: Date })
  lastResponseAt: Date;
}

export const BroadcastSchema = SchemaFactory.createForClass(Broadcast);

BroadcastSchema.index({ location: "2dsphere" });
BroadcastSchema.index({ buyer: 1, createdAt: -1 });
