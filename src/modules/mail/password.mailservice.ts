import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { join } from 'node:path';

@Injectable()
export class PasswordEmailService {
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async sendClientCredentials(email: string, password: string, firstName: string): Promise<void> {
    const logoPath = join(process.cwd(), 'src/assets/images/MoFreshLogo.png');

    try {
      await this.transporter.sendMail({
        from: `"MoFresh Support" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Welcome to MoFresh - Your Account Credentials',
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to MoFresh</title>
          </head>
          <body style="margin:0;padding:0;background-color:#f4f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fa;padding:40px 20px;">
              <tr>
                <td align="center">
                  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                    
                    <!-- Header -->
                    <tr>
                      <td style="background:linear-gradient(135deg,#2e7d32 0%,#1b5e20 60%,#ffa726 100%);padding:40px;text-align:center;">
                        <div style="width:80px;height:80px;background-color:rgba(255,255,255,0.2);border-radius:16px;margin:0 auto 16px;display:inline-flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.3);">
                          <img src="cid:mofresh_logo" alt="MoFresh Logo" style="width:60px;height:60px;border-radius:8px;" />
                        </div>
                        <h1 style="color:#ffffff;font-size:28px;margin:0 0 8px;font-weight:700;">Welcome to MoFresh! </h1>
                        <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;">Your account has been successfully created</p>
                      </td>
                    </tr>

                    <!-- Welcome Message -->
                    <tr>
                      <td style="padding:40px 40px 0;">
                        <p style="color:#334155;font-size:16px;line-height:1.6;margin:0 0 8px;">Hello ${firstName},</p>
                        <p style="color:#64748b;font-size:15px;line-height:1.7;margin:0 0 28px;">
                          Welcome to MoFresh! Your account has been created successfully. Below are your login credentials. Please keep them secure and change your password after your first login.
                        </p>
                      </td>
                    </tr>

                    <!-- Credentials Box -->
                    <tr>
                      <td style="padding:0 40px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#f0f9f1 0%,#fff8e1 100%);border:2px solid #2e7d32;border-radius:12px;overflow:hidden;">
                          <tr>
                            <td style="padding:24px 28px 12px;">
                              <p style="color:#1b5e20;font-size:14px;font-weight:700;margin:0 0 16px;text-transform:uppercase;letter-spacing:1.5px;"> Your Login Credentials</p>
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
                                <li>Log in and change your password immediately</li>
                                <li>Never share your credentials with anyone</li>
                                <li>Keep your account information secure</li>
                                <li>Contact support if you have any concerns</li>
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
                                Once logged in, you can explore your dashboard, manage your profile and settings, and access all the features available to you. If you need any assistance, our support team is here to help 24/7.
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
                          <a href="mailto:${process.env.COMPANY_EMAIL}" style="color:#2e7d32;text-decoration:none;font-weight:500;">${process.env.COMPANY_EMAIL}</a>
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
            cid: 'mofresh_logo',
          },
        ],
      });
      console.log('✅ Client credentials email sent to:', email);
    } catch (error) {
      console.error('❌ Email delivery failed:', error);
      throw error;
    }
  }
}
