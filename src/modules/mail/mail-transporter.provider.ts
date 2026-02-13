import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sib from '@getbrevo/brevo';

export const MAIL_TRANSPORTER = 'MAIL_TRANSPORTER';

export const mailTransporterProvider = {
  provide: MAIL_TRANSPORTER,
  useFactory: (configService: ConfigService) => {
    const logger = new Logger('MailTransporter');
    const brevoApiKey = configService.get<string>('BREVO_API_KEY');
    const emailDisabled = configService.get<string>('DISABLE_EMAIL') === 'true';

    if (emailDisabled) {
      logger.warn('⚠️ Email service is DISABLED via DISABLE_EMAIL env variable');
      return {
        // eslint-disable-next-line @typescript-eslint/require-await
        sendTransacEmail: async () => {
          logger.log('📧 Email sending skipped (service disabled)');
          return { body: { messageId: 'disabled' } };
        },
      };
    }

    if (!brevoApiKey) {
      logger.error('❌ BREVO_API_KEY not configured');
      return {
        sendTransacEmail: () => {
          logger.error('📧 Cannot send email: BREVO_API_KEY not configured');
          throw new Error('Email service not configured');
        },
      };
    }

    logger.log('📧 Initializing Brevo email service');

    const apiInstance = new sib.TransactionalEmailsApi();
    apiInstance.setApiKey(sib.TransactionalEmailsApiApiKeys.apiKey, brevoApiKey);

    return apiInstance;
  },
  inject: [ConfigService],
};
