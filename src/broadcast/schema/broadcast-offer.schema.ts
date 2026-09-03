import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export const BROADCAST_OFFER_STATUSES = ["pending", "accepted", "declined"] as const;
export type BroadcastOfferStatus = (typeof BROADCAST_OFFER_STATUSES)[number];

@Schema({ timestamps: true })
export class BroadcastOffer extends Document {
  @Prop({ type: Types.ObjectId, ref: "Broadcast", required: true })
  broadcast: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "BroadcastThread", required: true, unique: true })
  thread: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  offerer: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  creator: Types.ObjectId;

  @Prop({ type: Number, default: null })
  price: number | null;

  @Prop({ type: String, required: true, maxlength: 1000 })
  message: string;

  @Prop({ type: String, enum: BROADCAST_OFFER_STATUSES, default: "pending" })
  status: BroadcastOfferStatus;

  @Prop({ type: Date, default: null })
  respondedAt?: Date | null;
}

export const BroadcastOfferSchema = SchemaFactory.createForClass(BroadcastOffer);

// `thread`'s unique index comes from the @Prop({ unique: true }) above.
BroadcastOfferSchema.index({ creator: 1, status: 1, updatedAt: -1 });
