import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

/** One row per (service, user) pair, ever — existence = "this user has clicked WhatsApp for
 *  this service". Repeat clicks by the same user don't recount. */
@Schema({ timestamps: true })
export class ServiceWhatsappClick {
  @Prop({ type: Types.ObjectId, ref: "Service", required: true })
  serviceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  userId: Types.ObjectId;
}

export type ServiceWhatsappClickDocument = ServiceWhatsappClick & Document;
export const ServiceWhatsappClickSchema = SchemaFactory.createForClass(ServiceWhatsappClick);
ServiceWhatsappClickSchema.index({ serviceId: 1, userId: 1 }, { unique: true });
