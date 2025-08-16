import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';


@Schema()
export class Otp {
  @Prop()
  phoneNumber?: string; // Optional

  @Prop()
  email?: string; // Optional

  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ default: 'phone' })
  type: string; // 'phone' | 'email_verification' | etc.

  @Prop()
  expiresAt?: Date; // Optional, for expiration logic
}


export type OtpDocument = Otp & Document;
export const OtpSchema = SchemaFactory.createForClass(Otp);
