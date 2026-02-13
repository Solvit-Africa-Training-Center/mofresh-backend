/* eslint-disable @typescript-eslint/require-await */

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export const MAIL_TRANSPORTER = 'MAIL_TRANSPORTER';

export const mailTransporterProvider = {
  provide: MAIL_TRANSPORTER,
  useFactory: (configService: ConfigService) => {
    const logger = new Logger('MailTransporter');
    const adminEmail = configService.get<string>('ADMIN_EMAIL');
    const emailPassword = configService.get<string>('EMAIL_PASSWORD');
    const emailDisabled = configService.get<string>('DISABLE_EMAIL') === 'true';

    if (emailDisabled) {
      logger.warn('⚠️ Email service is DISABLED via DISABLE_EMAIL env variable');
      // Return a mock transporter that does nothing
      return {
        sendMail: async () => {
          logger.log('📧 Email sending skipped (service disabled)');
          return { accepted: [], rejected: [], messageId: 'disabled' };
        },
        verify: async () => true,
      };
    }

    if (!adminEmail || !emailPassword) {
      logger.error('❌ ADMIN_EMAIL or EMAIL_PASSWORD not configured');
      // Return a mock transporter
      return {
        sendMail: async () => {
          logger.error('📧 Cannot send email: credentials not configured');
          throw new Error('Email credentials not configured');
        },
        verify: async () => false,
      };
    }

    logger.log(`📧 Initializing Gmail SMTP for: ${adminEmail}`);

    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: adminEmail,
        pass: emailPassword,
      },
      connectionTimeout: 10000, // Reduced timeout
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  },
  inject: [ConfigService],
};
