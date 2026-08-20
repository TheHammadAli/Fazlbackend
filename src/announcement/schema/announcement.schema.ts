import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type AnnouncementDocument = HydratedDocument<Announcement>;

@Schema({ timestamps: true })
export class Announcement {
  @Prop({ unique: true, sparse: true, required: false })
  announcementCode?: string;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, required: true, trim: true })
  message: string;

  @Prop({ type: String })
  image?: string;

  /** Roles to notify, e.g. ["buyer","seller"]. Empty/omitted means all users. */
  @Prop({ type: [String], default: [] })
  targetAudience?: string[];

  @Prop({ type: Types.ObjectId, ref: "Category" })
  category?: Types.ObjectId;

  @Prop({ type: String, trim: true })
  location?: string;

  @Prop({ type: String, trim: true })
  ctaLabel?: string;

  @Prop({ type: String, trim: true })
  ctaDestination?: string;

  @Prop({ type: Date })
  scheduledAt?: Date;

  @Prop({ type: Date })
  expiresAt?: Date;

  @Prop({ type: String, enum: ["low", "medium", "high"], default: "medium" })
  priority?: string;

  @Prop({ type: String, enum: ["draft", "scheduled", "sent"], default: "sent" })
  status!: string;

  @Prop({ type: Date })
  sentAt?: Date;

  @Prop({ type: Types.ObjectId, required: true, ref: "User" })
  createdBy: Types.ObjectId;
}

export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);
