import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

/** One row per (service, user, day) — existence = "this user viewed this service on this day".
 *  Day-level dedup (not lifetime) so "Total Views" (row count, repeat visits on different days
 *  count again) and "Unique Visitors" (distinct userId count within this same collection) are
 *  genuinely different numbers. Still a pure dedup table, not a raw incrementing counter — a
 *  page refresh within the same day never inflates the count. */
@Schema({ timestamps: true })
export class ServiceView {
  @Prop({ type: Types.ObjectId, ref: "Service", required: true })
  serviceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  day: string;
}

export type ServiceViewDocument = ServiceView & Document;
export const ServiceViewSchema = SchemaFactory.createForClass(ServiceView);
ServiceViewSchema.index({ serviceId: 1, userId: 1, day: 1 }, { unique: true });
