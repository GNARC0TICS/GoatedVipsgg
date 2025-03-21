
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

export const sendConfirmationEmail = async (to: string, username: string) => {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject: 'Welcome to Goated VIPs - Please Confirm Your Email',
      html: `
        <div style="background-color: #14151A; color: #ffffff; padding: 20px; font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <img src="https://goatedvips.replit.app/logo.png" alt="Goated VIPs Logo" style="max-width: 200px; margin-bottom: 20px;"/>
          <h1 style="color: #D7FF00; margin-bottom: 20px;">Welcome to Goated VIPs, ${username}!</h1>
          <div style="background-color: #2A2B31; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin-bottom: 15px;">Thank you for registering with Goated VIPs! Your account has been created successfully.</p>
            <p style="margin-bottom: 15px;">You now have access to:</p>
            <ul style="list-style: none; padding-left: 0;">
              <li style="margin-bottom: 10px;">✓ Exclusive VIP programs</li>
              <li style="margin-bottom: 10px;">✓ Special rewards and bonuses</li>
              <li style="margin-bottom: 10px;">✓ Premium community access</li>
            </ul>
          </div>
          <p style="color: #8A8B91; font-size: 12px;">If you didn't create this account, please ignore this email.</p>
        </div>
      `,
    });
    log('Confirmation email sent successfully');
  } catch (error) {
    log('Error sending confirmation email:', error);
    throw error;
  }
};
