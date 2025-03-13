/**
 * Challenge entry command implementation for Telegram bot
 * Allows users to submit entries to challenges
 * Admins can verify and manage entries
 */

import TelegramBot from 'node-telegram-bot-api';
import { CommandDefinition, CommandAccessLevel } from './index';
import { logger, MessageTemplates, BotConfig } from '../utils';
import { db } from '@db';
import { challenges, challengeEntries, telegramUsers } from '../../../db/schema/telegram';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Pattern for challenge entry validation
 * Checks if the URL is a valid bet link
 */
const VALID_BET_URL_PATTERN = /^https?:\/\/(goated\.com|demo\.goated\.gg)\/.*$/i;

/**
 * Format challenge entry for display
 * @param entry Challenge entry data
 * @param challenge Challenge data
 * @returns Formatted entry message
 */
function formatEntry(entry: any, challenge: any): string {
  let message = `🎮 *Challenge Entry*\n\n`;
  
  message += `🎯 Challenge: *${challenge.game}* (ID: ${challenge.id})\n`;
  message += `🔗 Bet Link: ${entry.betLink}\n`;
  message += `🕒 Submitted: *${new Date(entry.submittedAt).toLocaleString()}*\n`;
  
  // Add status with appropriate emoji
  let statusEmoji = '⏳';
  if (entry.status === 'approved') {
    statusEmoji = '✅';
  } else if (entry.status === 'rejected') {
    statusEmoji = '❌';
  }
  
  message += `${statusEmoji} Status: *${entry.status.toUpperCase()}*\n`;
  
  // Add verification info if available
  if (entry.verifiedAt && entry.verifiedBy) {
    message += `👤 Verified by: *${entry.verifiedBy}*\n`;
    message += `🕒 Verified at: *${new Date(entry.verifiedAt).toLocaleString()}*\n`;
  }
  
  // Add bonus code if available
  if (entry.bonusCode) {
    message += `\n🎁 *BONUS CODE:* \`${entry.bonusCode}\`\n`;
    message += `Use this code on Goated.com for your reward!\n`;
  }
  
  return message;
}

/**
 * Command to submit a challenge entry
 */
const challengeEntryCommand: CommandDefinition = {
  name: 'challenge_entry',
  description: 'Submit a challenge entry',
  accessLevel: CommandAccessLevel.PUBLIC,
  pattern: /^\/challenge_entry\s+(\d+)\s+(.+)$/,
  requiresArgs: true,
  enabled: true,
  showInHelp: true,
  handler: async (bot: TelegramBot, msg: TelegramBot.Message, match: RegExpExecArray | null): Promise<void> => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    const username = msg.from?.username;
    
    if (!match || !match[1] || !match[2]) {
      await bot.sendMessage(
        chatId,
        'Invalid format. Use:\n/challenge_entry CHALLENGE_ID BET_LINK'
      );
      return;
    }
    
    const challengeId = parseInt(match[1]);
    const betLink = match[2].trim();
    
    if (isNaN(challengeId)) {
      await bot.sendMessage(chatId, '❌ Invalid challenge ID. Please provide a valid number.');
      return;
    }
    
    // Validate the bet link
    if (!VALID_BET_URL_PATTERN.test(betLink)) {
      await bot.sendMessage(
        chatId,
        '❌ Invalid bet link. Link must be from Goated.com or demo.goated.gg.'
      );
      return;
    }
    
    try {
      // Check if the challenge exists and is active
      const challengeResult = await db
        .select()
        .from(challenges)
        .where(and(
          eq(challenges.id, challengeId),
          eq(challenges.status, 'active')
        ))
        .execute();
      
      if (challengeResult.length === 0) {
        await bot.sendMessage(
          chatId,
          `❌ Challenge with ID ${challengeId} not found or is no longer active.`
        );
        return;
      }
      
      const challenge = challengeResult[0];
      
      // Check if the user is verified
      const userResult = await db
        .select()
        .from(telegramUsers)
        .where(eq(telegramUsers.telegramId, userId))
        .execute();
      
      if (userResult.length === 0 || !userResult[0].isVerified) {
        await bot.sendMessage(
          chatId,
          '❌ You must verify your account first using the /verify command before submitting challenge entries.'
        );
        return;
      }
      
      // Check if user already submitted an entry for this challenge
      const existingEntry = await db
        .select()
        .from(challengeEntries)
        .where(and(
          eq(challengeEntries.challengeId, challengeId),
          eq(challengeEntries.telegramId, userId)
        ))
        .execute();
      
      if (existingEntry.length > 0) {
        await bot.sendMessage(
          chatId,
          '❌ You have already submitted an entry for this challenge. You can only submit one entry per challenge.'
        );
        return;
      }
      
      // Create the challenge entry
      const newEntry = await db
        .insert(challengeEntries)
        .values({
          challengeId: challengeId,
          telegramId: userId,
          betLink: betLink,
          status: 'pending',
          submittedAt: new Date(),
          updatedAt: new Date()
        })
        .returning()
        .execute();
      
      logger.info('Challenge entry submitted', {
        userId,
        username,
        challengeId,
        entryId: newEntry[0].id
      });
      
      // Send confirmation
      await bot.sendMessage(
        chatId,
        `✅ Your entry for challenge #${challengeId} has been submitted successfully!\n\nAn admin will review your entry soon. You'll be notified when it's verified.`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      logger.error('Error submitting challenge entry', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        challengeId
      });
      
      await bot.sendMessage(chatId, MessageTemplates.ERRORS.SERVER_ERROR);
    }
  }
};

/**
 * Command to list entries for a challenge (admin only)
 */
const listEntriesCommand: CommandDefinition = {
  name: 'list_entries',
  description: 'List entries for a challenge',
  accessLevel: CommandAccessLevel.ADMIN,
  pattern: /^\/list_entries\s+(\d+)(?:\s+(all|pending|approved|rejected))?$/,
  requiresArgs: true,
  enabled: true,
  showInHelp: true,
  handler: async (bot: TelegramBot, msg: TelegramBot.Message, match: RegExpExecArray | null): Promise<void> => {
    const chatId = msg.chat.id;
    const adminId = msg.from?.id;
    
    if (!match || !match[1]) {
      await bot.sendMessage(
        chatId,
        'Invalid format. Use:\n/list_entries CHALLENGE_ID [STATUS]\nWhere STATUS is one of: all, pending, approved, rejected'
      );
      return;
    }
    
    const challengeId = parseInt(match[1]);
    const status = match[2] || 'all';
    
    if (isNaN(challengeId)) {
      await bot.sendMessage(chatId, '❌ Invalid challenge ID. Please provide a valid number.');
      return;
    }
    
    try {
      // Check if the challenge exists
      const challengeResult = await db
        .select()
        .from(challenges)
        .where(eq(challenges.id, challengeId))
        .execute();
      
      if (challengeResult.length === 0) {
        await bot.sendMessage(chatId, `❌ Challenge with ID ${challengeId} not found.`);
        return;
      }
      
      const challenge = challengeResult[0];
      
      // Build query for entries
      let query = db
        .select()
        .from(challengeEntries)
        .where(eq(challengeEntries.challengeId, challengeId));
      
      // Add status filter if not 'all'
      if (status !== 'all') {
        query = query.where(eq(challengeEntries.status, status));
      }
      
      // Execute query
      const entries = await query.orderBy(desc(challengeEntries.submittedAt)).execute();
      
      if (entries.length === 0) {
        await bot.sendMessage(
          chatId,
          `No ${status === 'all' ? '' : status + ' '}entries found for challenge #${challengeId}.`
        );
        return;
      }
      
      // Format and send entries list
      let message = `📋 *Entries for Challenge #${challengeId}*\n`;
      message += `🎮 *${challenge.game}*\n\n`;
      
      // Add status filter info if any
      if (status !== 'all') {
        message += `Showing *${status.toUpperCase()}* entries only.\n\n`;
      }
      
      entries.forEach((entry, index) => {
        const statusEmoji = entry.status === 'approved' ? '✅' : 
                            entry.status === 'rejected' ? '❌' : '⏳';
        
        message += `${index + 1}. Entry #${entry.id} by ${entry.telegramId}\n`;
        message += `   ${statusEmoji} Status: ${entry.status.toUpperCase()}\n`;
        message += `   🔗 [Bet Link](${entry.betLink})\n`;
        message += `   👀 /review_entry ${entry.id}\n\n`;
      });
      
      await bot.sendMessage(chatId, message, { 
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });
      
      logger.info('Challenge entries listed', {
        adminId,
        challengeId,
        status,
        count: entries.length
      });
    } catch (error) {
      logger.error('Error listing challenge entries', {
        error: error instanceof Error ? error.message : String(error),
        adminId,
        challengeId
      });
      
      await bot.sendMessage(chatId, MessageTemplates.ERRORS.SERVER_ERROR);
    }
  }
};

/**
 * Command to approve or reject a challenge entry (admin only)
 */
const verifyEntryCommand: CommandDefinition = {
  name: 'verify_entry',
  description: 'Verify a challenge entry',
  accessLevel: CommandAccessLevel.ADMIN,
  pattern: /^\/verify_entry\s+(\d+)\s+(approve|reject)(?:\s+(.+))?$/,
  requiresArgs: true,
  enabled: true,
  showInHelp: true,
  handler: async (bot: TelegramBot, msg: TelegramBot.Message, match: RegExpExecArray | null): Promise<void> => {
    const chatId = msg.chat.id;
    const adminId = msg.from?.id;
    const adminUsername = msg.from?.username || adminId?.toString();
    
    if (!match || !match[1] || !match[2]) {
      await bot.sendMessage(
        chatId,
        'Invalid format. Use:\n/verify_entry ENTRY_ID approve [BONUS_CODE]\nor\n/verify_entry ENTRY_ID reject'
      );
      return;
    }
    
    const entryId = parseInt(match[1]);
    const action = match[2]; // 'approve' or 'reject'
    const bonusCode = match[3] ? match[3].trim() : null;
    
    if (isNaN(entryId)) {
      await bot.sendMessage(chatId, '❌ Invalid entry ID. Please provide a valid number.');
      return;
    }
    
    try {
      // Check if the entry exists
      const entryResult = await db
        .select({
          entry: challengeEntries,
          challenge: challenges
        })
        .from(challengeEntries)
        .innerJoin(challenges, eq(challengeEntries.challengeId, challenges.id))
        .where(eq(challengeEntries.id, entryId))
        .execute();
      
      if (entryResult.length === 0) {
        await bot.sendMessage(chatId, `❌ Entry with ID ${entryId} not found.`);
        return;
      }
      
      const entry = entryResult[0].entry;
      const challenge = entryResult[0].challenge;
      
      // Check if entry is already verified
      if (entry.status !== 'pending') {
        await bot.sendMessage(
          chatId,
          `⚠️ This entry has already been ${entry.status}. Current status: ${entry.status.toUpperCase()}`
        );
        return;
      }
      
      // Update entry status
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      
      await db
        .update(challengeEntries)
        .set({
          status: newStatus,
          bonusCode: action === 'approve' ? bonusCode : null,
          verifiedAt: new Date(),
          verifiedBy: adminUsername,
          updatedAt: new Date()
        })
        .where(eq(challengeEntries.id, entryId))
        .execute();
      
      // Get updated entry
      const updatedEntryResult = await db
        .select()
        .from(challengeEntries)
        .where(eq(challengeEntries.id, entryId))
        .execute();
      
      const updatedEntry = updatedEntryResult[0];
      
      logger.info('Challenge entry verified', {
        adminId,
        adminUsername,
        entryId,
        status: newStatus,
        challengeId: challenge.id
      });
      
      // Send confirmation to admin
      await bot.sendMessage(
        chatId,
        `✅ Entry #${entryId} has been ${newStatus}!`,
        { parse_mode: 'Markdown' }
      );
      
      // Notify the user
      try {
        const userId = parseInt(entry.telegramId);
        
        if (!isNaN(userId)) {
          let userMessage = '';
          
          if (newStatus === 'approved') {
            userMessage = `🎉 Congratulations! Your entry for the "${challenge.game}" challenge has been approved!\n\n`;
            
            if (bonusCode) {
              userMessage += `🎁 *BONUS CODE:* \`${bonusCode}\`\n`;
              userMessage += `Use this code on ${BotConfig.PLAY_URL} to claim your reward!\n\n`;
            }
            
            userMessage += `Thank you for participating! Keep an eye out for more challenges.`;
          } else {
            userMessage = `We're sorry, but your entry for the "${challenge.game}" challenge could not be verified.\n\n`;
            userMessage += `Please check the challenge requirements and try again with a new submission.\n\n`;
            userMessage += `If you have any questions, please contact ${BotConfig.SUPPORT_USERNAME} for assistance.`;
          }
          
          await bot.sendMessage(userId, userMessage, { parse_mode: 'Markdown' });
          
          await bot.sendMessage(chatId, `✅ User notification sent successfully.`);
        }
      } catch (error) {
        logger.error('Failed to notify user about entry verification', {
          error: error instanceof Error ? error.message : String(error),
          userId: entry.telegramId,
          entryId
        });
        
        await bot.sendMessage(chatId, `⚠️ Note: Failed to notify the user about their verification.`);
      }
    } catch (error) {
      logger.error('Error verifying challenge entry', {
        error: error instanceof Error ? error.message : String(error),
        adminId,
        entryId,
        action
      });
      
      await bot.sendMessage(chatId, MessageTemplates.ERRORS.SERVER_ERROR);
    }
  }
};

/**
 * Command to view a specific entry
 */
const reviewEntryCommand: CommandDefinition = {
  name: 'review_entry',
  description: 'Review a challenge entry',
  accessLevel: CommandAccessLevel.ADMIN,
  pattern: /^\/review_entry\s+(\d+)$/,
  requiresArgs: true,
  enabled: true,
  showInHelp: true,
  handler: async (bot: TelegramBot, msg: TelegramBot.Message, match: RegExpExecArray | null): Promise<void> => {
    const chatId = msg.chat.id;
    const adminId = msg.from?.id;
    
    if (!match || !match[1]) {
      await bot.sendMessage(chatId, 'Please specify an entry ID. Usage: /review_entry ID');
      return;
    }
    
    const entryId = parseInt(match[1]);
    
    if (isNaN(entryId)) {
      await bot.sendMessage(chatId, '❌ Invalid entry ID. Please provide a valid number.');
      return;
    }
    
    try {
      // Get the entry with challenge info
      const entryResult = await db
        .select({
          entry: challengeEntries,
          challenge: challenges
        })
        .from(challengeEntries)
        .innerJoin(challenges, eq(challengeEntries.challengeId, challenges.id))
        .where(eq(challengeEntries.id, entryId))
        .execute();
      
      if (entryResult.length === 0) {
        await bot.sendMessage(chatId, `❌ Entry with ID ${entryId} not found.`);
        return;
      }
      
      const entry = entryResult[0].entry;
      const challenge = entryResult[0].challenge;
      
      // Format the entry details
      let message = formatEntry(entry, challenge);
      
      // Add admin actions if entry is pending
      if (entry.status === 'pending') {
        message += `\n*Admin Actions:*\n`;
        message += `✅ Approve: \`/verify_entry ${entryId} approve BONUS_CODE\`\n`;
        message += `❌ Reject: \`/verify_entry ${entryId} reject\`\n`;
      }
      
      await bot.sendMessage(chatId, message, { 
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });
      
      logger.info('Entry reviewed', {
        adminId,
        entryId
      });
    } catch (error) {
      logger.error('Error reviewing entry', {
        error: error instanceof Error ? error.message : String(error),
        adminId,
        entryId
      });
      
      await bot.sendMessage(chatId, MessageTemplates.ERRORS.SERVER_ERROR);
    }
  }
};

/**
 * Command for users to check their entries
 */
const myEntriesCommand: CommandDefinition = {
  name: 'my_entries',
  description: 'Check your challenge entries',
  accessLevel: CommandAccessLevel.PUBLIC,
  enabled: true,
  showInHelp: true,
  handler: async (bot: TelegramBot, msg: TelegramBot.Message): Promise<void> => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    
    try {
      // Get user's entries with challenge information
      const entriesResult = await db
        .select({
          entry: challengeEntries,
          challenge: challenges
        })
        .from(challengeEntries)
        .innerJoin(challenges, eq(challengeEntries.challengeId, challenges.id))
        .where(eq(challengeEntries.telegramId, userId))
        .orderBy(desc(challengeEntries.submittedAt))
        .execute();
      
      if (entriesResult.length === 0) {
        await bot.sendMessage(
          chatId,
          `You haven't submitted any challenge entries yet.\n\nUse /challenges to see available challenges.`
        );
        return;
      }
      
      // Format and send entries list
      let message = `🎮 *Your Challenge Entries*\n\n`;
      
      entriesResult.forEach((result, index) => {
        const entry = result.entry;
        const challenge = result.challenge;
        
        const statusEmoji = entry.status === 'approved' ? '✅' : 
                         entry.status === 'rejected' ? '❌' : '⏳';
        
        message += `${index + 1}. *${challenge.game}* (Challenge #${challenge.id})\n`;
        message += `   ${statusEmoji} Status: ${entry.status.toUpperCase()}\n`;
        message += `   🕒 Submitted: ${new Date(entry.submittedAt).toLocaleDateString()}\n`;
        
        if (entry.status === 'approved' && entry.bonusCode) {
          message += `   🎁 Bonus: \`${entry.bonusCode}\`\n`;
        }
        
        message += `\n`;
      });
      
      message += `Find more challenges with /challenges`;
      
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      
      logger.info('User entries listed', {
        userId,
        count: entriesResult.length
      });
    } catch (error) {
      logger.error('Error listing user entries', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      
      await bot.sendMessage(chatId, MessageTemplates.ERRORS.SERVER_ERROR);
    }
  }
};

export {
  challengeEntryCommand,
  listEntriesCommand,
  verifyEntryCommand,
  reviewEntryCommand,
  myEntriesCommand
};
export default challengeEntryCommand;