/**
 * Verification command for Telegram bot
 * Handles user verification flow to link Telegram and Goated accounts
 */

import TelegramBot from 'node-telegram-bot-api';
import { CommandDefinition, CommandAccessLevel } from './index';
import { logger, stateManager, apiClient, MessageTemplates } from '../utils';
import { db } from '@db';
import { telegramUsers, verificationRequests, insertVerificationRequestSchema } from '../../../db/schema/telegram';
import { eq } from 'drizzle-orm';

/**
 * Verification command handler
 */
const verifyCommand: CommandDefinition = {
  name: 'verify',
  description: 'Link your Goated account',
  accessLevel: CommandAccessLevel.PUBLIC,
  pattern: /^\/verify(?:\s+(.+))?$/,
  enabled: true,
  showInHelp: true,
  handler: async (bot: TelegramBot, msg: TelegramBot.Message, match: RegExpExecArray | null): Promise<void> => {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id.toString();
    const telegramUsername = msg.from?.username;
    
    if (!telegramId) {
      await bot.sendMessage(chatId, MessageTemplates.ERRORS.USER_NOT_FOUND);
      return;
    }

    // Step 1: Check if user is already verified
    try {
      const existingUser = await db
        .select()
        .from(telegramUsers)
        .where(eq(telegramUsers.telegramId, telegramId))
        .execute();

      // If user is already verified, let them know
      if (existingUser.length > 0 && existingUser[0].isVerified) {
        await bot.sendMessage(
          chatId,
          `✅ Your account is already verified! You are linked to Goated username: ${existingUser[0].goatedUsername}`
        );
        return;
      }

      // Step 2: Check if a verification request is already pending
      const existingRequest = await db
        .select()
        .from(verificationRequests)
        .where(eq(verificationRequests.telegramId, telegramId))
        .execute();

      if (existingRequest.length > 0 && existingRequest[0].status === 'pending') {
        await bot.sendMessage(
          chatId,
          `⏳ You already have a pending verification request for Goated username: ${existingRequest[0].goatedUsername}\n\nPlease wait for an admin to verify your account.`
        );
        return;
      }

      // Step 3: If no username provided, ask for it
      if (!match || !match[1]) {
        // Set user state to 'awaiting_username'
        if (msg.from) {
          stateManager.updateUserState(msg.from.id, {
            verificationState: 'awaiting_username',
            lastAction: Date.now()
          });
        }
        
        await bot.sendMessage(
          chatId,
          `👋 To verify your account, please provide your Goated.com username.\n\nReply with your username now.`
        );
        return;
      }

      // Step 4: Process the provided username
      const goatedUsername = match[1].trim();
      await createVerificationRequest(bot, chatId, telegramId, telegramUsername, goatedUsername);
    } catch (error) {
      logger.error('Error in verify command', {
        error: error instanceof Error ? error.message : String(error),
        telegramId,
        telegramUsername
      });
      await bot.sendMessage(chatId, MessageTemplates.ERRORS.SERVER_ERROR);
    }
  }
};

/**
 * Create a verification request in the database
 */
async function createVerificationRequest(
  bot: TelegramBot,
  chatId: number,
  telegramId: string,
  telegramUsername?: string,
  goatedUsername?: string
): Promise<void> {
  if (!goatedUsername) {
    await bot.sendMessage(chatId, 'Please provide a valid Goated username.');
    return;
  }

  try {
    // First validate the username format
    if (goatedUsername.length < 3) {
      await bot.sendMessage(chatId, 'Goated username must be at least 3 characters long.');
      return;
    }

    // Create or update verification request
    const verificationData = {
      telegramId,
      goatedUsername,
      telegramUsername: telegramUsername || null,
      status: 'pending',
      requestedAt: new Date(),
      updatedAt: new Date()
    };

    // Validate with Zod
    const validationResult = insertVerificationRequestSchema.safeParse(verificationData);
    if (!validationResult.success) {
      logger.error('Validation error in verification request', {
        errors: validationResult.error.errors,
        telegramId
      });
      await bot.sendMessage(chatId, 'There was an error validating your verification request. Please try again.');
      return;
    }

    // Insert or update the verification request
    await db
      .insert(verificationRequests)
      .values(verificationData)
      .onConflictDoUpdate({
        target: verificationRequests.telegramId,
        set: {
          goatedUsername,
          telegramUsername: telegramUsername || null,
          status: 'pending',
          updatedAt: new Date()
        }
      });

    // Create or update user record
    await db
      .insert(telegramUsers)
      .values({
        telegramId,
        telegramUsername: telegramUsername || null,
        goatedUsername,
        isVerified: false,
        createdAt: new Date(),
        lastActive: new Date(),
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: telegramUsers.telegramId,
        set: {
          telegramUsername: telegramUsername || null,
          goatedUsername,
          lastActive: new Date(),
          updatedAt: new Date()
        }
      });

    // Send confirmation message
    await bot.sendMessage(
      chatId,
      `✅ Verification request submitted for Goated username: ${goatedUsername}\n\nAn admin will verify your account shortly. You'll receive a notification when your account is verified.`
    );

    // Notify admin(s) of new verification request
    const adminNotification = `🆕 New verification request:\nTelegram: ${telegramUsername || 'No username'} (${telegramId})\nGoated: ${goatedUsername}\n\nUse /verify_user ${telegramId} to approve.`;
    
    // TODO: Send to admin chat or admin users
    logger.info('New verification request', {
      telegramId,
      telegramUsername,
      goatedUsername
    });
  } catch (error) {
    logger.error('Error creating verification request', {
      error: error instanceof Error ? error.message : String(error),
      telegramId,
      goatedUsername
    });
    await bot.sendMessage(chatId, 'An error occurred while processing your verification request. Please try again later.');
  }
}

export default verifyCommand;