/**
 * Admin command to verify a user's Telegram account
 * Links a Telegram user to their Goated account after admin verification
 */

import TelegramBot from "node-telegram-bot-api";
import { CommandDefinition, CommandAccessLevel } from "./index";
import { logger, stateManager, apiClient, MessageTemplates } from "../utils";
import { db } from "@db";
import {
  telegramUsers,
  verificationRequests,
} from "../../../db/schema/telegram";
import { eq, and } from "drizzle-orm";

/**
 * Admin command to verify a user and link their accounts
 */
const verifyUserCommand: CommandDefinition = {
  name: "verify_user",
  description: "Approve a user verification request",
  accessLevel: CommandAccessLevel.ADMIN,
  pattern: /^\/verify_user(?:\s+(.+))?$/,
  requiresArgs: true,
  enabled: true,
  showInHelp: true,
  handler: async (
    bot: TelegramBot,
    msg: TelegramBot.Message,
    match: RegExpExecArray | null,
  ): Promise<void> => {
    const chatId = msg.chat.id;
    const adminId = msg.from?.id.toString();
    const adminUsername = msg.from?.username;

    if (!match || !match[1]) {
      await bot.sendMessage(
        chatId,
        "Please specify a Telegram ID to verify. Usage: /verify_user <telegram_id>",
      );
      return;
    }

    const telegramId = match[1].trim();

    try {
      // Check if verification request exists
      const request = await db
        .select()
        .from(verificationRequests)
        .where(eq(verificationRequests.telegramId, telegramId))
        .execute();

      if (request.length === 0) {
        await bot.sendMessage(
          chatId,
          `❌ No verification request found for Telegram ID: ${telegramId}`,
        );
        return;
      }

      const verificationRequest = request[0];

      // Check if request is already approved
      if (verificationRequest.status === "approved") {
        await bot.sendMessage(
          chatId,
          `✅ This user is already verified by ${verificationRequest.verifiedBy || "an admin"} on ${verificationRequest.verifiedAt?.toLocaleString() || "unknown date"}`,
        );
        return;
      }

      // Approve the request
      await db
        .update(verificationRequests)
        .set({
          status: "approved",
          verifiedBy: adminUsername || adminId,
          verifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(verificationRequests.telegramId, telegramId))
        .execute();

      // Update user record
      await db
        .update(telegramUsers)
        .set({
          isVerified: true,
          verifiedBy: adminUsername || adminId,
          verifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(telegramUsers.telegramId, telegramId))
        .execute();

      // Log the verification
      logger.info("User verification approved", {
        telegramId,
        goatedUsername: verificationRequest.goatedUsername,
        approvedBy: adminUsername || adminId,
      });

      // Send confirmation to admin
      await bot.sendMessage(
        chatId,
        `✅ Successfully verified Telegram user ${telegramId}\nLinked to Goated username: ${verificationRequest.goatedUsername}`,
      );

      // Notify the user
      try {
        await bot.sendMessage(
          parseInt(telegramId),
          MessageTemplates.SUCCESS.VERIFICATION +
            `\n\nYour Telegram account is now linked to Goated username: ${verificationRequest.goatedUsername}\n\nYou can now use all features of the bot!`,
        );
      } catch (error) {
        logger.error("Failed to notify user about verification", {
          error: error instanceof Error ? error.message : String(error),
          telegramId,
        });
        await bot.sendMessage(
          chatId,
          `Note: Failed to notify the user about their verification.`,
        );
      }
    } catch (error) {
      logger.error("Error in verify_user command", {
        error: error instanceof Error ? error.message : String(error),
        telegramId,
        adminId,
      });
      await bot.sendMessage(chatId, MessageTemplates.ERRORS.SERVER_ERROR);
    }
  },
};

/**
 * Admin command to list pending verification requests
 */
const listRequestsCommand: CommandDefinition = {
  name: "list_requests",
  description: "List pending verification requests",
  accessLevel: CommandAccessLevel.ADMIN,
  enabled: true,
  showInHelp: true,
  handler: async (
    bot: TelegramBot,
    msg: TelegramBot.Message,
  ): Promise<void> => {
    const chatId = msg.chat.id;

    try {
      // Get pending verification requests
      const requests = await db
        .select()
        .from(verificationRequests)
        .where(eq(verificationRequests.status, "pending"))
        .execute();

      if (requests.length === 0) {
        await bot.sendMessage(
          chatId,
          "✅ No pending verification requests at this time.",
        );
        return;
      }

      // Format the list of requests
      let message = `🔍 *Pending Verification Requests* \\(${requests.length}\\):\n\n`;

      requests.forEach((request, index) => {
        message += `${index + 1}\\. Telegram: ${request.telegramUsername || "No username"} \\(${request.telegramId}\\)\n`;
        message += `   Goated: ${request.goatedUsername}\n`;
        message += `   Requested: ${new Date(request.requestedAt || "").toLocaleString()}\n`;
        message += `   Verify with: \`/verify_user ${request.telegramId}\`\n\n`;
      });

      await bot.sendMessage(chatId, message, { parse_mode: "MarkdownV2" });
    } catch (error) {
      logger.error("Error in list_requests command", {
        error: error instanceof Error ? error.message : String(error),
      });
      await bot.sendMessage(chatId, MessageTemplates.ERRORS.SERVER_ERROR);
    }
  },
};

export { verifyUserCommand, listRequestsCommand };
export default verifyUserCommand;
