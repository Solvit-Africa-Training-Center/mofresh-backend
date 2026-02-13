/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, OnModuleInit, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { MAIL_TRANSPORTER } from './mail-transporter.provider';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private emailEnabled = true;

  constructor(
    private readonly configService: ConfigService,
    @Inject(MAIL_TRANSPORTER) private readonly transporter: nodemailer.Transporter,
  ) {}

  async onModuleInit() {
    const emailDisabled = this.configService.get<string>('DISABLE_EMAIL') === 'true';
    
    if (emailDisabled) {
      this.emailEnabled = false;
      this.logger.warn('⚠️ Email service is DISABLED');
      return;
    }

    // Don't verify on startup to avoid blocking - just log a message
    this.logger.log('📧 Email service initialized (verification skipped for faster startup)');
    
    // Optional: verify in background without blocking
    this.verifyConnectionInBackground();
  }

  private async verifyConnectionInBackground() {
    try {
      await this.transporter.verify();
      this.logger.log('✅ Email service verified successfully');
      this.emailEnabled = true;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`❌ Email verification failed: ${err.message}`);
      this.logger.warn('⚠️ Emails will be logged but not sent. Set DISABLE_EMAIL=true to suppress this warning.');
      this.emailEnabled = false;
    }
  }

  private getLogoPath(): string {
    const paths = [
      join(process.cwd(), 'dist/assets/images/MoFreshLogo.png'),
      join(process.cwd(), 'src/assets/images/MoFreshLogo.png'),
      join(process.cwd(), 'assets/images/MoFreshLogo.png'),
    ];

    for (const p of paths) {
      if (existsSync(p)) return p;
    }

    return '';
  }

  async sendPasswordEmail(email: string, password: string, role: string) {
    if (!this.emailEnabled) {
      this.logger.log(`📧 [SKIPPED] Would send password email to: ${email}`);
      return;
    }

    const mailOptions = {
      from: `"MoFresh Support" <${this.configService.get<string>('ADMIN_EMAIL')}>`,
      to: email,
      subject: 'Your MoFresh Account Credentials',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Welcome to MoFresh!</h2>
          <p>An account has been created for you with the following details:</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Temporary Password:</strong> ${password}</p>
          <p><strong>Role:</strong> ${role}</p>
          <hr/>
          <p>Please log in and change your password immediately.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Password email sent to: ${email}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`❌ Failed to send password email to ${email}: ${err.message}`);
      // Don't throw - just log the error
    }
  }

  async sendOtpEmail(email: string, otp: string) {
    if (!this.emailEnabled) {
      this.logger.log(`📧 [SKIPPED] Would send OTP ${otp} to: ${email}`);
      return;
    }

    const mailOptions = {
      from: `"MoFresh Support" <${this.configService.get<string>('ADMIN_EMAIL')}>`,
      to: email,
      subject: 'Verification Code',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Verification Code</h2>
          <p>Your verification code is: <strong style="font-size: 24px;">${otp}</strong></p>
          <p>This code will expire in 15 minutes.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ OTP email sent to: ${email}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`❌ Failed to send OTP email to ${email}: ${err.message}`);
      // Don't throw - just log the error
    }
  }
}