import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { join } from 'node:path';

@Injectable()
export class ResetEmailService {
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

  async sendPasswordResetEmail(email: string, otpCode: string) {
    const logoPath = join(process.cwd(), 'src/assets/images/MoFreshLogo.png');

    const mailOptions = {
      from: `"MoFresh Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request - MoFresh',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - MoFresh</title>
        </head>
        <body style="margin:0;padding:0;background-color:#f4f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fa;padding:40px 20px;">
            <tr>
              <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                  
                  <!-- Header with gradient -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#2e7d32 0%,#1b5e20 50%,#ffa726 100%);padding:40px 40px 30px;text-align:center;">
                      <div style="width:80px;height:80px;background-color:rgba(255,255,255,0.2);border-radius:16px;margin:0 auto 16px;display:inline-flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.3);">
                        <img src="cid:mofresh_logo" alt="MoFresh Logo" style="width:60px;height:60px;border-radius:8px;" />
                      </div>
                      <h1 style="color:#ffffff;font-size:26px;margin:0 0 6px;font-weight:700;letter-spacing:-0.5px;">Password Reset Request </h1>
                      <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;">Secure One-Time Password</p>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding:40px;">
                      <p style="color:#334155;font-size:16px;line-height:1.6;margin:0 0 8px;">Hello,</p>
                      <p style="color:#64748b;font-size:15px;line-height:1.7;margin:0 0 30px;">
                        We received a request to reset your password. Please use the following one-time password (OTP) to complete your password reset. Do not share this code with anyone.
                      </p>

                      <!-- OTP Code Box -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center">
                            <div style="background:linear-gradient(135deg,#f0f9f1 0%,#fff8e1 100%);border:2px solid #2e7d32;border-radius:12px;padding:30px 20px;text-align:center;max-width:380px;margin:0 auto;">
                              <p style="color:#64748b;font-size:13px;margin:0 0 12px;text-transform:uppercase;letter-spacing:2px;font-weight:600;">Your Reset Code</p>
                              <div style="font-size:42px;font-weight:800;letter-spacing:12px;color:#1b5e20;font-family:'Courier New',monospace;margin:0 0 12px;">
                                ${otpCode.split('').join('&nbsp;')}
                              </div>
                              <div style="display:inline-block;background-color:#fff3cd;border:1px solid #ffa726;border-radius:20px;padding:6px 16px;">
                                <span style="color:#e65100;font-size:12px;font-weight:600;">⏱ Expires in 15 minutes</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </table>

                      <!-- Security Warning -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:30px;">
                        <tr>
                          <td style="background-color:#ffebee;border-radius:10px;padding:20px;border-left:4px solid #f44336;">
                            <p style="color:#c62828;font-size:14px;font-weight:700;margin:0 0 8px;"> Security Alert</p>
                            <p style="color:#d32f2f;font-size:13px;line-height:1.8;margin:0;">
                              If you didn't request a password reset, please ignore this email and ensure your account is secure. Consider changing your password if you suspect unauthorized access.
                            </p>
                          </td>
                        </tr>
                      </table>

                      <!-- Security Tips -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                        <tr>
                          <td style="background-color:#f0f9f1;border-radius:10px;padding:20px;border-left:4px solid #2e7d32;">
                            <p style="color:#1b5e20;font-size:14px;font-weight:700;margin:0 0 8px;"> Security Tips</p>
                            <ul style="color:#2e7d32;font-size:13px;line-height:1.8;margin:0;padding-left:18px;">
                              <li>Never share this OTP with anyone</li>
                              <li>Our team will never ask for your OTP</li>
                              <li>This code is valid for one use only</li>
                              <li>Choose a strong, unique password</li>
                            </ul>
                          </td>
                        </tr>
                      </table>

                      <p style="color:#64748b;font-size:14px;line-height:1.6;margin:28px 0 0;">
                        For security reasons, never share this code with anyone, including MoFresh support staff.
                      </p>
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
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent to:', email);
    } catch (error) {
      console.error('❌ Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }
}
