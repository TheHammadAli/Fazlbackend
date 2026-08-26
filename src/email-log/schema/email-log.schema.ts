import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export const EMAIL_LOG_EVENTS = [
  "shop_created",
  "listing_created",
  "service_created",
  "booking_accepted",
  "broadcast_created",
] as const;
export type EmailLogEvent = (typeof EMAIL_LOG_EVENTS)[number];

export const EMAIL_LOG_STATUSES = ["sent", "failed"] as const;
export type EmailLogStatus = (typeof EMAIL_LOG_STATUSES)[number];

@Schema({ timestamps: true })
export class EmailLog {
  @Prop({ required: true, unique: true })
  emailId: string;

  @Prop({ required: true, trim: true })
  recipient: string;

  /** Human-readable code of the record the email is about, e.g. a shop/listing/service/job/broadcast code. */
  @Prop({ trim: true })
  relatedRecordId?: string;

  @Prop({ type: String, enum: EMAIL_LOG_EVENTS, required: true })
  eventType: EmailLogEvent;

  @Prop({ type: String, enum: EMAIL_LOG_STATUSES, required: true })
  deliveryStatus: EmailLogStatus;
}

export type EmailLogDocument = EmailLog & Document;
export const EmailLogSchema = SchemaFactory.createForClass(EmailLog);
