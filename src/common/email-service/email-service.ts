import { Injectable, Logger } from '@nestjs/common';
import { BrevoClient } from '@getbrevo/brevo';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly brevo: BrevoClient;

  constructor() {
    this.brevo = new BrevoClient({
      apiKey: process.env.BREVO_API_KEY!,
    });
  }

  async sendEmail(to: string, subject: string, html: string) {
    try {
      const response = await this.brevo.transactionalEmails.sendTransacEmail({
        sender: {
          name: 'Fazl',
          email: process.env.EMAIL_FROM!,
        },
        to: [
          {
            email: to,
          },
        ],
        subject,
        htmlContent: html,
      });

      this.logger.log(`Email sent successfully`);
      this.logger.debug(response);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}