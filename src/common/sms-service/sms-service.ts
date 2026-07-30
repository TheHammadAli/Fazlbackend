import { Injectable } from '@nestjs/common';
import Twilio from 'twilio';

@Injectable()
export class SmsService {
  private client: Twilio.Twilio;

  constructor() {
    this.client = Twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!,
    );
  }

  async sendOtp(phone: string, otp: string) {
    const message = await this.client.messages.create({
      body: `Your Fazl verification code is ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: phone,
    });

    return message.sid;
  }
}