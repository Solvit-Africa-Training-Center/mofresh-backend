import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sib from '@getbrevo/brevo';
import { MAIL_TRANSPORTER } from './mail-transporter.provider';

@Injectable()
export class PasswordEmailService {
  private readonly logger = new Logger(PasswordEmailService.name);
  private readonly emailEnabled: boolean = true;

  constructor(
    private readonly configService: ConfigService,
    @Inject(MAIL_TRANSPORTER) private readonly brevo: sib.TransactionalEmailsApi,
  ) {
    const emailDisabled = this.configService.get<string>('DISABLE_EMAIL') === 'true';
    if (emailDisabled) {
      this.emailEnabled = false;
      this.logger.warn('⚠️ Email service is DISABLED');
    }
  }

  async sendClientCredentials(email: string, password: string, firstName: string): Promise<void> {
    if (!this.emailEnabled) {
      this.logger.log(`📧 [SKIPPED] Would send credentials to: ${email}`);
      return;
    }

    const fromEmail = this.configService.get<string>('FROM_EMAIL');
    const sendSmtpEmail = new sib.SendSmtpEmail();

    sendSmtpEmail.subject = 'Welcome to MoFresh - Your Account Credentials';
    sendSmtpEmail.htmlContent = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Hello ${firstName},</h2>
        <p>Welcome to MoFresh! Your account has been created successfully.</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Temporary Password:</strong> ${password}</p>
        <hr/>
        <p>Please log in and change your password immediately.</p>
      </div>
    `;
    sendSmtpEmail.sender = { name: 'MoFresh Support', email: fromEmail };
    sendSmtpEmail.to = [{ email: email }];

    try {
      await this.brevo.sendTransacEmail(sendSmtpEmail);
      this.logger.log(`✅ Welcome email sent to: ${email}`);
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      this.logger.error(`❌ Brevo Failure: ${error.message}`);
    }
  }
}
