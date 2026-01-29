import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { join } from 'path';

@Injectable()
export class MailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.ADMIN_EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async sendOtpEmail(email: string, otp: string) {
   
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
                        <a href="mailto:${process.env.ADMIN_EMAIL}" style="color: #2e7d32; text-decoration: none; font-weight: 500;">${process.env.ADMIN_EMAIL}</a>
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
          cid: 'unique_logo_id'
        }
      ]
    };
    
    await this.transporter.sendMail(mailOptions);
  }
}