/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, OnModuleInit, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sib from '@getbrevo/brevo';
import { MAIL_TRANSPORTER } from './mail-transporter.provider';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private emailEnabled = true;

  constructor(
    private readonly configService: ConfigService,
    @Inject(MAIL_TRANSPORTER) private readonly brevo: sib.TransactionalEmailsApi,
  ) {}

  // eslint-disable-next-line @typescript-eslint/require-await
  async onModuleInit() {
    const emailDisabled = this.configService.get<string>('DISABLE_EMAIL') === 'true';
    
    if (emailDisabled) {
      this.emailEnabled = false;
      this.logger.warn('⚠️ Email service is DISABLED via DISABLE_EMAIL env variable');
      return;
    }

    const brevoKey = this.configService.get<string>('BREVO_API_KEY');
    if (!brevoKey) {
      this.logger.error('❌ BREVO_API_KEY not found - emails will not be sent');
      this.emailEnabled = false;
      return;
    }

    this.logger.log('✅ Brevo email service ready');
    this.emailEnabled = true;
  }

  async sendPasswordEmail(email: string, password: string, role: string) {
    if (!this.emailEnabled) {
      this.logger.log(`📧 [SKIPPED] Would send password email to: ${email}`);
      return;
    }

    const fromEmail = this.configService.get<string>('FROM_EMAIL');
    const sendSmtpEmail = new sib.SendSmtpEmail();

    sendSmtpEmail.subject = "Your MoFresh Account Credentials";
    sendSmtpEmail.htmlContent = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Welcome to MoFresh!</h2>
        <p>An account has been created for you with the following details:</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Temporary Password:</strong> ${password}</p>
        <p><strong>Role:</strong> ${role}</p>
        <hr/>
        <p>Please log in and change your password immediately.</p>
      </div>
    `;
    sendSmtpEmail.sender = { name: "MoFresh Support", email: fromEmail };
    sendSmtpEmail.to = [{ email: email }];

    try {
      const data = await this.brevo.sendTransacEmail(sendSmtpEmail);
      this.logger.log(`✅ Password email sent to: ${email} (MsgID: ${data.body.messageId})`);
    } catch (error: any) {
      this.logger.error(`❌ Brevo Failure: ${error.message}`);
    }
  }

  async sendOtpEmail(email: string, otp: string) {
    if (!this.emailEnabled) {
      this.logger.log(`📧 [SKIPPED] Would send OTP ${otp} to: ${email}`);
      return;
    }

    const fromEmail = this.configService.get<string>('FROM_EMAIL');
    const sendSmtpEmail = new sib.SendSmtpEmail();

    sendSmtpEmail.subject = "Verification Code";
    sendSmtpEmail.htmlContent = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Verification Code</h2>
        <p>Your verification code is: <strong style="font-size: 24px;">${otp}</strong></p>
        <p>This code will expire in 15 minutes.</p>
      </div>
    `;
    sendSmtpEmail.sender = { name: "MoFresh Support", email: fromEmail };
    sendSmtpEmail.to = [{ email: email }];

    try {
      const data = await this.brevo.sendTransacEmail(sendSmtpEmail);
      this.logger.log(`✅ OTP email sent to: ${email} (MsgID: ${data.body.messageId})`);
    } catch (error: any) {
      this.logger.error(`❌ Brevo Failure: ${error.message}`);
    }
  }
}