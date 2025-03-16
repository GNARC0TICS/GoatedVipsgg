
import { db } from '@db';
import { telegramUsers, verificationRequests } from '../../../db/schema/telegram';
import { eq } from 'drizzle-orm';
import { logger } from './logger';

export class VerificationManager {
  static async startVerification(telegramId: string, goatedUsername: string) {
    try {
      // Check if user is already verified
      const existingUser = await db.select()
        .from(telegramUsers)
        .where(eq(telegramUsers.telegramId, telegramId))
        .execute();

      if (existingUser?.[0]?.isVerified) {
        return {
          success: false,
          message: 'You are already verified!'
        };
      }

      // Create verification request
      await db.insert(verificationRequests)
        .values({
          telegramId,
          goatedUsername,
          status: 'pending',
          createdAt: new Date()
        })
        .execute();

      return {
        success: true,
        message: 'Verification request submitted! Please wait for admin approval.'
      };
    } catch (error) {
      logger.error('Verification request error', { error, telegramId });
      return {
        success: false,
        message: 'An error occurred while processing your verification request.'
      };
    }
  }
}
