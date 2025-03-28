import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { db } from '@db/connection';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';
import { log } from '../vite';

/**
 * Email Service for sending verification emails, password reset emails, and other notifications
 */

/**
 * Email Service class for sending various types of emails
 */
export class EmailService {
  private transporter: nodemailer.Transporter;
  private baseUrl: string;
  private fromEmail: string;

  /**
   * Creates a new email service instance
   */
  constructor() {
    // Create reusable transporter object using SMTP transport
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });

    // Set base URL for links
    this.baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@goatedvips.com';

    // Log configuration in development
    if (process.env.NODE_ENV !== 'production') {
      log(`Email service configured with base URL: ${this.baseUrl}`);
    }
  }

  /**
   * Sends a verification email to a newly registered user
   * @param userId The user's ID
   * @param email The user's email address
   * @param username The user's username
   * @returns Success status and message
   */
  async sendVerificationEmail(userId: number, email: string, username: string): Promise<{ success: boolean; message: string }> {
    try {
      // Generate verification token
      const token = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 24); // Token valid for 24 hours

      // Save token to database
      await db.update(users)
        .set({
          verificationToken: token,
          verificationTokenExpiry: tokenExpiry,
        })
        .where(eq(users.id, userId));

      // Create verification URL
      const verificationUrl = `${this.baseUrl}/api/auth/verify-email?token=${token}`;

      // Send email
      await this.transporter.sendMail({
        from: `"GoatedVIPs" <${this.fromEmail}>`,
        to: email,
        subject: 'Verify your email address',
        text: `Hello ${username},\n\nPlease verify your email address by clicking on the link below:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you did not create an account, please ignore this email.\n\nRegards,\nThe GoatedVIPs Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
            <h2 style="color: #333;">Verify your email address</h2>
            <p>Hello ${username},</p>
            <p>Please verify your email address by clicking on the button below:</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #FFD700; color: #000; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 3px; font-size: 14px;">${verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you did not create an account, please ignore this email.</p>
            <p>Regards,<br>The GoatedVIPs Team</p>
          </div>
        `,
      });

      return { success: true, message: 'Verification email sent successfully' };
    } catch (error) {
      log(`Error sending verification email: ${error}`);
      return { success: false, message: 'Failed to send verification email' };
    }
  }

  /**
   * Verifies a user's email using the verification token
   * @param token The verification token
   * @returns Success status, message, and userId if successful
   */
  async verifyEmail(token: string): Promise<{ success: boolean; message: string; userId?: number }> {
    try {
      // Find user with this token
      const user = await db.select()
        .from(users)
        .where(eq(users.verificationToken, token))
        .then(rows => rows[0]);

      if (!user) {
        return { success: false, message: 'Invalid verification token' };
      }

      // Check if token is expired
      if (user.verificationTokenExpiry && new Date() > user.verificationTokenExpiry) {
        return { success: false, message: 'Verification token has expired' };
      }

      // Check if already verified
      if (user.isEmailVerified) {
        return { success: true, message: 'Email already verified', userId: user.id };
      }

      // Update user as verified
      await db.update(users)
        .set({
          isEmailVerified: true,
          verificationToken: null,
          verificationTokenExpiry: null,
        })
        .where(eq(users.id, user.id));

      return { success: true, message: 'Email verified successfully', userId: user.id };
    } catch (error) {
      log(`Error verifying email: ${error}`);
      return { success: false, message: 'An error occurred while verifying email' };
    }
  }

  /**
   * Sends a password reset email to a user
   * @param email The user's email address
   * @returns Success status and message
   */
  async sendPasswordResetEmail(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // Find user with this email
      const user = await db.select()
        .from(users)
        .where(eq(users.email, email))
        .then(rows => rows[0]);

      // If user not found, return success for security
      if (!user) {
        return { success: true, message: 'If your email is registered, you will receive a password reset link shortly' };
      }

      // Generate reset token
      const token = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 1); // Token valid for 1 hour

      // Save token to database
      await db.update(users)
        .set({
          passwordResetToken: token,
          passwordResetTokenExpiry: tokenExpiry,
        })
        .where(eq(users.id, user.id));

      // Create reset URL
      const resetUrl = `${this.baseUrl}/reset-password?token=${token}`;

      // Send email
      await this.transporter.sendMail({
        from: `"GoatedVIPs" <${this.fromEmail}>`,
        to: email,
        subject: 'Reset your password',
        text: `Hello ${user.username},\n\nYou requested a password reset. Please click on the link below to reset your password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request a password reset, please ignore this email.\n\nRegards,\nThe GoatedVIPs Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
            <h2 style="color: #333;">Reset your password</h2>
            <p>Hello ${user.username},</p>
            <p>You requested a password reset. Please click on the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #FFD700; color: #000; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 3px; font-size: 14px;">${resetUrl}</p>
            <p>This link will expire in 1 hour.</p>
            <p>If you did not request a password reset, please ignore this email.</p>
            <p>Regards,<br>The GoatedVIPs Team</p>
          </div>
        `,
      });

      return { success: true, message: 'Password reset email sent successfully' };
    } catch (error) {
      log(`Error sending password reset email: ${error}`);
      return { success: true, message: 'If your email is registered, you will receive a password reset link shortly' };
    }
  }

  /**
   * Validates a password reset token
   * @param token The password reset token
   * @returns Success status, message, and userId if successful
   */
  async validatePasswordResetToken(token: string): Promise<{ success: boolean; message: string; userId?: number }> {
    try {
      // Find user with this token
      const user = await db.select()
        .from(users)
        .where(eq(users.passwordResetToken, token))
        .then(rows => rows[0]);

      if (!user) {
        return { success: false, message: 'Invalid reset token' };
      }

      // Check if token is expired
      if (user.passwordResetTokenExpiry && new Date() > user.passwordResetTokenExpiry) {
        return { success: false, message: 'Reset token has expired' };
      }

      return { success: true, message: 'Valid reset token', userId: user.id };
    } catch (error) {
      log(`Error validating password reset token: ${error}`);
      return { success: false, message: 'An error occurred while validating reset token' };
    }
  }
}

export const emailService = new EmailService();