import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

/** Singleton site-wide settings — one document per fixed `_id` key (mirrors Counter's pattern). */
@Schema({ collection: "site_settings", timestamps: true })
export class SiteSettings {
  @Prop({ required: true })
  _id: string;

  @Prop({ type: String, default: null })
  facebookUrl?: string | null;

  @Prop({ type: String, default: null })
  twitterUrl?: string | null;

  @Prop({ type: String, default: null })
  threadsUrl?: string | null;

  @Prop({ type: String, default: null })
  linkedinUrl?: string | null;
}

export type SiteSettingsDocument = SiteSettings & Document;
export const SiteSettingsSchema = SchemaFactory.createForClass(SiteSettings);
