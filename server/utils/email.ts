import nodemailer from 'nodemailer';
import { log } from '../vite';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendConfirmationEmail = async (to: string, username: string, verificationToken: string) => {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject: 'Welcome to Goated VIPs - Email Verification Required',
      attachments: [{
        filename: 'logo.png',
        path: './client/public/images/Goated logo with text.png',
        cid: 'logo'
      }],
      html: `
        <div style="background-color: #14151A; color: #ffffff; padding: 40px; font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px;">
          <img src="cid:logo" alt="Goated VIPs Logo" style="width: 200px; height: auto; margin-bottom: 30px; display: block;"/>
          <h1 style="color: #D7FF00; margin-bottom: 25px; text-shadow: 0 0 10px rgba(215,255,0,0.3);">Verify Your Email, ${username}!</h1>
          <div style="background-color: #2A2B31; padding: 30px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #3A3B41;">
            <p style="margin-bottom: 20px; font-size: 16px; line-height: 1.6; color: #FFFFFF;">To complete your registration and access all Goated VIPs features, please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://goatedvips.replit.app/verify-email?token=${verificationToken}" style="background-color: #D7FF00; color: #14151A; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; text-transform: uppercase; letter-spacing: 1px;">Verify Email</a>
            </div>
            <p style="margin-bottom: 20px; color: #FFFFFF;">Once verified, you'll have access to:</p>
            <ul style="list-style: none; padding-left: 0; margin-bottom: 25px;">
              <li style="margin-bottom: 15px; color: #FFFFFF;">✨ Exclusive VIP Programs</li>
              <li style="margin-bottom: 15px; color: #FFFFFF;">💎 Special Rewards & Bonuses</li>
              <li style="margin-bottom: 15px; color: #FFFFFF;">🌟 Premium Community Access</li>
            </ul>
          </div>
          <div style="text-align: center; color: #8A8B91; font-size: 14px; border-top: 1px solid #2A2B31; padding-top: 20px;">
            <p>If you didn't create this account, please ignore this email.</p>
            <p style="margin-top: 10px;">© 2024 Goated VIPs. All rights reserved.</p>
          </div>
        </div>
      `,
    });
    log('Confirmation email sent successfully');
  } catch (error) {
    log('Error sending confirmation email:', error);
    throw error;
  }
};