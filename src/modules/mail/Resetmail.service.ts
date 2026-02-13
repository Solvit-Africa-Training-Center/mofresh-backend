/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sib from '@getbrevo/brevo';
import { MAIL_TRANSPORTER } from './mail-transporter.provider';

@Injectable()
export class ResetEmailService {
  private readonly logger = new Logger(ResetEmailService.name);
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

  async sendPasswordResetEmail(email: string, otpCode: string) {
    if (!this.emailEnabled) {
      this.logger.log(`📧 [SKIPPED] Would send reset OTP to: ${email}`);
      return;
    }

    const fromEmail = this.configService.get<string>('FROM_EMAIL');
    const sendSmtpEmail = new sib.SendSmtpEmail();

    sendSmtpEmail.subject = 'Password Reset Request - MoFresh';
    sendSmtpEmail.htmlContent = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Password Reset Request</h2>
        <p>Use the code below to reset your password:</p>
        <div style="font-size: 24px; font-weight: bold; background: #f0f0f0; padding: 10px; display: inline-block;">
          ${otpCode}
        </div>
        <p>This code will expire in 15 minutes.</p>
      </div>
    `;
    sendSmtpEmail.sender = { name: 'MoFresh Support', email: fromEmail };
    sendSmtpEmail.to = [{ email: email }];

    try {
      await this.brevo.sendTransacEmail(sendSmtpEmail);
      this.logger.log(`✅ Reset email sent to: ${email}`);
    } catch (error: any) {
      this.logger.error(`❌ Brevo Failure: ${error.message}`);
    }
  }
}
