import { Injectable, Logger } from '@nestjs/common';
import Twilio from 'twilio';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private client: Twilio.Twilio | null = null;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken && accountSid.startsWith('AC')) {
      try {
        this.client = Twilio(accountSid, authToken);
      } catch (err) {
        this.logger.error(
          'Failed to initialize Twilio client — SmsService will throw if sendOtp is called',
          err,
        );
      }
    } else {
      this.logger.warn(
        'TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set (or invalid) — SmsService will throw if sendOtp is called',
      );
    }
  }

  async sendOtp(phone: string, otp: string) {
    if (!this.client) {
      throw new Error('SmsService is not configured (missing Twilio credentials)');
    }

    const message = await this.client.messages.create({
      body: `Your Fazl verification code is ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: phone,
    });

    return message.sid;
  }
}