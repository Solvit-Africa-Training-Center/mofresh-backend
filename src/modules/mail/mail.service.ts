import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { join } from 'node:path';

@Injectable()
export class MailService implements OnModuleInit {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    const emailPassword = this.configService.get<string>('EMAIL_PASSWORD');

    if (!adminEmail || !emailPassword) {
      this.logger.warn(
        'Email configuration missing: ADMIN_EMAIL and EMAIL_PASSWORD not set. Email features will be disabled.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: adminEmail,
        pass: emailPassword,
      },
    });

    try {
      await this.transporter.verify();
      this.logger.log('Email service ready');
    } catch (error) {
      this.logger.error('❌ Email service failed:', (error as Error).message);
    }
  }

  async sendPasswordEmail(email: string, password: string, role: string) {
    if (!this.transporter) {
      this.logger.warn('Email service not configured. Skipping password email send.');
      return;
    }
    const logoPath = join(process.cwd(), 'src/assets/images/MoFreshLogo.png');
    const mailOptions = {
      from: `"MoFresh Support" <${this.configService.get<string>('ADMIN_EMAIL')}>`,
      to: email,
      subject: 'Your MoFresh Account Credentials',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Created - MoFresh</title>
        </head>
        <body style="margin:0;padding:0;background-color:#f4f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fa;padding:40px 20px;">
            <tr>
              <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                  
                  <!-- Header with gradient -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#2e7d32 0%,#1b5e20 100%);padding:40px;text-align:center;">
                      <img src="cid:unique_logo_id" width="140" alt="MoFresh Logo" style="display:block;margin:0 auto 20px;max-width:100%;height:auto;" />
                      <h1 style="color:#ffffff;font-size:28px;margin:0 0 8px;font-weight:700;letter-spacing:-0.5px;">Welcome to MoFresh! </h1>
                      <p style="color:rgba(255,255,255,0.9);font-size:15px;margin:0;">Your account has been successfully created</p>
                    </td>
                  </tr>

                  <!-- Welcome Message -->
                  <tr>
                    <td style="padding:40px 40px 0;">
                      <p style="color:#334155;font-size:16px;line-height:1.6;margin:0 0 8px;">Hello and Welcome!</p>
                      <p style="color:#64748b;font-size:15px;line-height:1.7;margin:0 0 28px;">
                        Your MoFresh account has been created by the administrator with the role of <strong style="color:#2e7d32;">${role}</strong>. Below are your login credentials. Please keep them secure and change your password after your first login.
                      </p>
                    </td>
                  </tr>

                  <!-- Credentials Box -->
                  <tr>
                    <td style="padding:0 40px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#f0f9f1 0%,#e8f5e9 100%);border:2px solid #2e7d32;border-radius:12px;overflow:hidden;">
                        <tr>
                          <td style="padding:24px 28px 12px;">
                            <p style="color:#1b5e20;font-size:14px;font-weight:700;margin:0 0 16px;text-transform:uppercase;letter-spacing:1.5px;">📧 Your Login Credentials</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:0 28px 10px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,255,255,0.8);border-radius:8px;border:1px solid #c8e6c9;">
                              <tr>
                                <td style="padding:14px 16px;border-bottom:1px solid #e8f5e9;">
                                  <span style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Email Address</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding:12px 16px;">
                                  <span style="color:#1b5e20;font-size:16px;font-weight:700;font-family:'Courier New',monospace;">${email}</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:0 28px 10px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,255,255,0.8);border-radius:8px;border:1px solid #c8e6c9;">
                              <tr>
                                <td style="padding:14px 16px;border-bottom:1px solid #e8f5e9;">
                                  <span style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Account Role</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding:12px 16px;">
                                  <span style="color:#1b5e20;font-size:16px;font-weight:700;text-transform:capitalize;">${role}</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:0 28px 24px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,255,255,0.8);border-radius:8px;border:1px solid #c8e6c9;">
                              <tr>
                                <td style="padding:14px 16px;border-bottom:1px solid #e8f5e9;">
                                  <span style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Temporary Password</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding:12px 16px;">
                                  <span style="color:#1b5e20;font-size:18px;font-weight:700;font-family:'Courier New',monospace;letter-spacing:1px;">${password}</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Important Notice -->
                  <tr>
                    <td style="padding:28px 40px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="background-color:#fff8e1;border-radius:10px;padding:20px;border-left:4px solid #ffa726;">
                            <p style="color:#e65100;font-size:14px;font-weight:700;margin:0 0 8px;"> Important Security Steps</p>
                            <ul style="color:#f57c00;font-size:13px;line-height:1.8;margin:0;padding-left:18px;">
                              <li>Change your password immediately after first login</li>
                              <li>Do not share your credentials with anyone</li>
                              <li>Keep your account information secure</li>
                              <li>Contact support if you did not request this account</li>
                            </ul>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Getting Started -->
                  <tr>
                    <td style="padding:0 40px 36px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f9f1;border-radius:10px;padding:20px;border-left:4px solid #2e7d32;">
                        <tr>
                          <td style="padding:20px;">
                            <p style="color:#1b5e20;font-size:14px;font-weight:700;margin:0 0 10px;"> Getting Started</p>
                            <p style="color:#2e7d32;font-size:13px;line-height:1.7;margin:0;">
                              Once logged in, explore your dashboard to manage your profile, settings, and access all the features available to you. Our support team is here to help if you need assistance.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color:#f8fafc;padding:30px 40px;text-align:center;border-top:1px solid #e2e8f0;">
                      <p style="margin:0 0 12px;color:#64748b;font-size:13px;line-height:1.6;">
                        Need help? Contact us at 
                        <a href="mailto:${this.configService.get<string>('COMPANY_EMAIL')}" style="color:#2e7d32;text-decoration:none;font-weight:500;">${this.configService.get<string>('COMPANY_EMAIL')}</a>
                      </p>
                      <p style="margin:0;color:#94a3b8;font-size:12px;">
                        © ${new Date().getFullYear()} MoFresh. All rights reserved.
                      </p>
                    </td>
                  </tr>

                </table>
                
                <!-- Email disclaimer -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:600px;margin:20px auto 0;">
                  <tr>
                    <td style="text-align:center;padding:0 20px;">
                      <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.5;">
                        This is an automated message, please do not reply to this email.
                      </p>
                    </td>
                  </tr>
                </table>
                
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: 'MoFreshLogo.png',
          path: logoPath,
          cid: 'unique_logo_id',
        },
      ],
    };
    await this.transporter.sendMail(mailOptions);
  }

  async sendOtpEmail(email: string, otp: string) {
    if (!this.transporter) {
      this.logger.warn('Email service not configured. Skipping OTP email send.');
      return;
    }
    const logoPath = join(process.cwd(), 'src/assets/images/MoFreshLogo.png');

    const mailOptions = {
      from: `"MoFresh Support" <${process.env.ADMIN_EMAIL}>`,
      to: email,
      subject: 'Your MoFresh Verification Code',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verification Code</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f7fa;">
            <tr>
              <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07); overflow: hidden;">
                  
                  <!-- Header with gradient background -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%); padding: 40px 30px; text-align: center;">
                      <img src="cid:unique_logo_id" width="140" alt="MoFresh Logo" style="display: block; margin: 0 auto 20px; max-width: 100%; height: auto;" />
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">Verification Code</h1>
                    </td>
                  </tr>
                  
                  <!-- Main content -->
                  <tr>
                    <td style="padding: 50px 40px;">
                      <p style="margin: 0 0 24px; color: #334155; font-size: 16px; line-height: 1.6;">
                        Hello,
                      </p>
                      <p style="margin: 0 0 32px; color: #334155; font-size: 16px; line-height: 1.6;">
                        We received a request to verify your account. Use the code below to complete your verification:
                      </p>
                      
                      <!-- OTP Code Box -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td style="text-align: center; padding: 32px 0;">
                            <div style="background: linear-gradient(135deg, #f0f9f1 0%, #e8f5e9 100%); border: 2px solid #2e7d32; border-radius: 12px; padding: 24px; display: inline-block; min-width: 240px;">
                              <p style="margin: 0 0 8px; color: #1b5e20; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Your Code</p>
                              <p style="margin: 0; color: #2e7d32; font-size: 42px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</p>
                            </div>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Timer warning -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td style="background-color: #fff8e1; border-left: 4px solid #ffa726; padding: 16px 20px; border-radius: 8px; margin: 24px 0;">
                            <p style="margin: 0; color: #e65100; font-size: 14px; line-height: 1.5;">
                              ⏱️ <strong>Time-sensitive:</strong> This code will expire in <strong>5 minutes</strong> for security purposes.
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 32px 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                        If you didn't request this code, please ignore this email or contact our support team if you have concerns.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8fafc; padding: 30px 40px; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 0 0 12px; color: #64748b; font-size: 13px; line-height: 1.6; text-align: center;">
                        Need help? Contact us at 
                        <a href="mailto:${process.env.COMPANY_EMAIL}" style="color: #2e7d32; text-decoration: none; font-weight: 500;">${process.env.COMPANY_EMAIL}</a>
                      </p>
                      <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
                        © ${new Date().getFullYear()} MoFresh. All rights reserved.
                      </p>
                    </td>
                  </tr>
                  
                </table>
                
                <!-- Email client disclaimer -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 20px auto 0;">
                  <tr>
                    <td style="text-align: center; padding: 0 20px;">
                      <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                        This is an automated message, please do not reply to this email.
                      </p>
                    </td>
                  </tr>
                </table>
                
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: 'MoFreshLogo.png',
          path: logoPath,
          cid: 'unique_logo_id',
        },
      ],
    };

    await this.transporter.sendMail(mailOptions);
  }
}
