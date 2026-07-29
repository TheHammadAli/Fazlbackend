import { promises as dns } from 'node:dns';
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService implements OnModuleInit {
    private readonly logger = new Logger(EmailService.name);
    private transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: false,
        requireTLS: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    async onModuleInit() {
        try {
            const records = await dns.lookup(process.env.SMTP_HOST!, {
                all: true,
            });

            console.log(records);
            await this.transporter.verify();
            this.logger.log('SMTP connection verified.');
        } catch (error) {
            this.logger.error('Failed to verify SMTP connection.', error);
        }
    }

    async sendEmail(to: string, subject: string, html: string) {
        await this.transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to,
            subject,
            html,
        });
    }
}