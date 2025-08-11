import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Otp {
  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  createdAt: Date;
}

export type OtpDocument = Otp & Document;
export const OtpSchema = SchemaFactory.createForClass(Otp);
