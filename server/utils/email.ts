
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
        <h1>Welcome to Goated VIPs, ${username}!</h1>
        <p>Thank you for registering. Your account has been created successfully.</p>
        <p>You can now log in and start using our services.</p>
      `,
    });
    log('Confirmation email sent successfully');
  } catch (error) {
    log('Error sending confirmation email:', error);
    throw error;
  }
};
