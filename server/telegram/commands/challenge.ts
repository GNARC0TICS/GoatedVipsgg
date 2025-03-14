/**
 * Challenge command implementation for Telegram bot
 * Allows admins to create and manage challenges
 * Users can view and participate in challenges
 */

import TelegramBot from "node-telegram-bot-api";
import { CommandDefinition, CommandAccessLevel } from "./index";
import { logger, MessageTemplates, isAdmin } from "../utils";
import { db } from "@db";
import { challenges, challengeEntries } from "../../../db/schema/telegram";
import { eq, and, desc } from "drizzle-orm";

/**
 * Pattern for challenge creation command arguments
 * Format: /create_challenge Game | 1.5x | $10 | $100 | 5 | 24h | Description
 */
const CREATE_CHALLENGE_PATTERN =
  /^\/create_challenge\s+([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]*)\s*\|\s*(.+)$/;

/**
 * Convert human-readable timeframe to a standardized format
 * @param timeframe Timeframe string (e.g., "24h", "2d", "1w")
 * @returns Standardized timeframe string
 */
function normalizeTimeframe(timeframe: string): string {
  const trimmed = timeframe.trim();
  if (!trimmed) return "24h"; // Default to 24 hours

  // Already in the right format
  if (/^\d+[hdw]$/.test(trimmed)) {
    return trimmed;
  }

  // Convert common words to standard format
  const lowered = trimmed.toLowerCase();
  if (lowered.includes("day")) {
    const days = parseInt(lowered) || 1;
    return `${days}d`;
  } else if (lowered.includes("hour")) {
    const hours = parseInt(lowered) || 24;
    return `${hours}h`;
  } else if (lowered.includes("week")) {
    const weeks = parseInt(lowered) || 1;
    return `${weeks}w`;
  }

  // If no pattern matches, default to 24 hours
  return "24h";
}

/**
 * Format challenge for display
 * @param challenge Challenge data to format
 * @param includeId Whether to include challenge ID
 * @returns Formatted challenge message
 */
function formatChallenge(challenge: any, includeId = false): string {
  let message = "";

  if (includeId) {
    message += `🆔 Challenge ID: *${challenge.id}*\n\n`;
  }

  message += `🎮 *${challenge.game}*\n\n`;

  if (challenge.multiplier) {
    message += `✖️ Multiplier: *${challenge.multiplier}*\n`;
  }

  message += `💵 Min Bet: *${challenge.minBet}*\n`;
  message += `🏆 Prize: *${challenge.prizeAmount}*\n`;
  message += `👥 Max Winners: *${challenge.maxWinners}*\n`;

  if (challenge.timeframe) {
    message += `⏱️ Timeframe: *${challenge.timeframe}*\n`;
  }

  message += `\n📝 *Description:*\n${challenge.description}\n\n`;

  // Add status
  switch (challenge.status) {
    case "active":
      message += `📊 Status: *ACTIVE*\n`;
      break;
    case "completed":
      message += `📊 Status: *COMPLETED*\n`;
      break;
    case "cancelled":
      message += `📊 Status: *CANCELLED*\n`;
      break;
    default:
      message += `📊 Status: *${challenge.status}*\n`;
  }

  message += `\n🎲 To participate, use:\n\`/challenge_entry ${challenge.id} your\\_bet\\_link\``;

  return message;
}

/**
 * Command to create a new challenge (admin only)
 */
const createChallengeCommand: CommandDefinition = {
  name: "create_challenge",
  description: "Create a new challenge",
  accessLevel: CommandAccessLevel.ADMIN,
  pattern: CREATE_CHALLENGE_PATTERN,
  requiresArgs: true,
  enabled: true,
  showInHelp: true,
  handler: async (
    bot: TelegramBot,
    msg: TelegramBot.Message,
    match: RegExpExecArray | null,
  ): Promise<void> => {
    const chatId = msg.chat.id;
    const adminId = msg.from?.id;
    const adminUsername = msg.from?.username;

    if (!match) {
      await bot.sendMessage(
        chatId,
        "Invalid format. Use:\n/create_challenge Game | Multiplier | Min Bet | Prize | Max Winners | Timeframe | Description",
      );
      return;
    }

    try {
      // Extract challenge parameters from the command
      const [
        ,
        game,
        multiplier,
        minBet,
        prizeAmount,
        maxWinnersStr,
        timeframe,
        description,
      ] = match;

      const maxWinners = parseInt(maxWinnersStr.trim());
      if (isNaN(maxWinners) || maxWinners < 1) {
        await bot.sendMessage(
          chatId,
          "❌ Max winners must be a positive number.",
        );
        return;
      }

      // Create the challenge in the database
      const newChallenge = await db
        .insert(challenges)
        .values({
          game: game.trim(),
          multiplier: multiplier.trim(),
          minBet: minBet.trim(),
          prizeAmount: prizeAmount.trim(),
          maxWinners: maxWinners,
          timeframe: normalizeTimeframe(timeframe.trim()),
          description: description.trim(),
          createdBy: adminUsername || adminId?.toString() || "admin",
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()
        .execute();

      logger.info("New challenge created", {
        challengeId: newChallenge[0].id,
        game: game.trim(),
        createdBy: adminUsername || adminId?.toString(),
      });

      // Send confirmation to admin
      await bot.sendMessage(
        chatId,
        `✅ Challenge created successfully!\n\n${formatChallenge(newChallenge[0], true)}`,
        { parse_mode: "Markdown" },
      );
    } catch (error) {
      logger.error("Error creating challenge", {
        error: error instanceof Error ? error.message : String(error),
        adminId,
      });

      await bot.sendMessage(chatId, MessageTemplates.ERRORS.SERVER_ERROR);
    }
  },
};

/**
 * Command to list active challenges
 */
const listChallengesCommand: CommandDefinition = {
  name: "challenges",
  description: "List available challenges",
  accessLevel: CommandAccessLevel.PUBLIC,
  enabled: true,
  showInHelp: true,
  handler: async (
    bot: TelegramBot,
    msg: TelegramBot.Message,
  ): Promise<void> => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    try {
      // Get active challenges
      const activeChallenges = await db
        .select()
        .from(challenges)
        .where(eq(challenges.status, "active"))
        .orderBy(desc(challenges.createdAt))
        .execute();

      if (activeChallenges.length === 0) {
        await bot.sendMessage(
          chatId,
          "No active challenges at this time. Check back later!",
        );
        return;
      }

      // Send list of challenges
      let message = `🎯 *Available Challenges* (${activeChallenges.length})\n\n`;

      activeChallenges.forEach((challenge, index) => {
        message += `${index + 1}. *${challenge.game}* - ${challenge.prizeAmount}\n`;
        message += `   ID: \`${challenge.id}\` - Use \`/challenge ${challenge.id}\` for details\n\n`;
      });

      message += `\nView details with \`/challenge ID\`\nSubmit an entry with \`/challenge_entry ID bet_link\``;

      await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });

      logger.info("Challenges listed", {
        userId,
        count: activeChallenges.length,
      });
    } catch (error) {
      logger.error("Error listing challenges", {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });

      await bot.sendMessage(chatId, MessageTemplates.ERRORS.SERVER_ERROR);
    }
  },
};

/**
 * Command to view a specific challenge
 */
const viewChallengeCommand: CommandDefinition = {
  name: "challenge",
  description: "View challenge details",
  accessLevel: CommandAccessLevel.PUBLIC,
  pattern: /^\/challenge(?:\s+(\d+))?$/,
  requiresArgs: true,
  enabled: true,
  showInHelp: true,
  handler: async (
    bot: TelegramBot,
    msg: TelegramBot.Message,
    match: RegExpExecArray | null,
  ): Promise<void> => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!match || !match[1]) {
      await bot.sendMessage(
        chatId,
        "Please specify a challenge ID. Usage: /challenge ID",
      );
      return;
    }

    const challengeId = parseInt(match[1]);
    if (isNaN(challengeId)) {
      await bot.sendMessage(
        chatId,
        "❌ Invalid challenge ID. Please provide a valid number.",
      );
      return;
    }

    try {
      // Get the challenge
      const challengeResult = await db
        .select()
        .from(challenges)
        .where(eq(challenges.id, challengeId))
        .execute();

      if (challengeResult.length === 0) {
        await bot.sendMessage(
          chatId,
          `❌ Challenge with ID ${challengeId} not found.`,
        );
        return;
      }

      const challenge = challengeResult[0];

      // Format and send challenge details
      const message = formatChallenge(challenge, true);

      await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });

      logger.info("Challenge viewed", {
        userId,
        challengeId,
      });
    } catch (error) {
      logger.error("Error viewing challenge", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        challengeId,
      });

      await bot.sendMessage(chatId, MessageTemplates.ERRORS.SERVER_ERROR);
    }
  },
};

/**
 * Command to complete or cancel a challenge (admin only)
 */
const updateChallengeStatusCommand: CommandDefinition = {
  name: "update_challenge",
  description: "Update challenge status",
  accessLevel: CommandAccessLevel.ADMIN,
  pattern: /^\/update_challenge\s+(\d+)\s+(completed|cancelled|active)$/,
  requiresArgs: true,
  enabled: true,
  showInHelp: true,
  handler: async (
    bot: TelegramBot,
    msg: TelegramBot.Message,
    match: RegExpExecArray | null,
  ): Promise<void> => {
    const chatId = msg.chat.id;
    const adminId = msg.from?.id;
    const adminUsername = msg.from?.username;

    if (!match || !match[1] || !match[2]) {
      await bot.sendMessage(
        chatId,
        "Invalid format. Use:\n/update_challenge ID status\nWhere status is one of: completed, cancelled, active",
      );
      return;
    }

    const challengeId = parseInt(match[1]);
    const newStatus = match[2];

    if (isNaN(challengeId)) {
      await bot.sendMessage(
        chatId,
        "❌ Invalid challenge ID. Please provide a valid number.",
      );
      return;
    }

    try {
      // Check if challenge exists
      const challengeResult = await db
        .select()
        .from(challenges)
        .where(eq(challenges.id, challengeId))
        .execute();

      if (challengeResult.length === 0) {
        await bot.sendMessage(
          chatId,
          `❌ Challenge with ID ${challengeId} not found.`,
        );
        return;
      }

      // Update challenge status
      await db
        .update(challenges)
        .set({
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(challenges.id, challengeId))
        .execute();

      logger.info("Challenge status updated", {
        challengeId,
        oldStatus: challengeResult[0].status,
        newStatus,
        updatedBy: adminUsername || adminId?.toString(),
      });

      // Send confirmation
      await bot.sendMessage(
        chatId,
        `✅ Challenge #${challengeId} status updated to: ${newStatus.toUpperCase()}`,
        { parse_mode: "Markdown" },
      );
    } catch (error) {
      logger.error("Error updating challenge status", {
        error: error instanceof Error ? error.message : String(error),
        adminId,
        challengeId,
        newStatus,
      });

      await bot.sendMessage(chatId, MessageTemplates.ERRORS.SERVER_ERROR);
    }
  },
};

export {
  createChallengeCommand,
  listChallengesCommand,
  viewChallengeCommand,
  updateChallengeStatusCommand,
};
export default createChallengeCommand;
