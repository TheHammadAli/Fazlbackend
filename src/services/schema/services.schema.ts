import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Service {
  @Prop({ unique: true, sparse: true, required: false })
  serviceCode?: string;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  ownerId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: false })
  price!: number;

  @Prop({
    required: true,
    enum: ["hourly", "fixed", "call_for_price"],
    default: "fixed",
  })
  paymentType!: "hourly" | "fixed" | "call_for_price";

  @Prop({ type: Boolean, default: true })
  requiresAppointment!: boolean;

  @Prop({ type: [String], default: [] })
  images!: string[];

  @Prop({ type: Types.ObjectId, ref: "Category", required: true })
  category!: Types.ObjectId;

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
  location!: {
    type: "Point";
    coordinates: [number, number];
  };

  @Prop({ required: false, trim: true })
  video!: string;

  @Prop({ type: Boolean, default: false })
  isDeleted!: boolean;

  @Prop({ type: Boolean, default: false })
  isDisabled?: boolean;


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

export const ServiceSchema = SchemaFactory.createForClass(Service);
ServiceSchema.index({ location: "2dsphere" });
export type ServiceDocument = Service & Document;
