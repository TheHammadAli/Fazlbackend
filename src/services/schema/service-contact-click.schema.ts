import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

/** One row per (service, user) pair, ever — existence = "this user has clicked Chat/Message
 *  Provider for this service". Repeat clicks by the same user don't recount. */
@Schema({ timestamps: true })
export class ServiceContactClick {
  @Prop({ type: Types.ObjectId, ref: "Service", required: true })
  serviceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  userId: Types.ObjectId;
}

export type ServiceContactClickDocument = ServiceContactClick & Document;
export const ServiceContactClickSchema = SchemaFactory.createForClass(ServiceContactClick);
ServiceContactClickSchema.index({ serviceId: 1, userId: 1 }, { unique: true });
