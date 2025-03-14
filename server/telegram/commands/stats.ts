/**
 * Stats command for the Telegram bot
 * Fetches and displays user statistics from the Goated platform
 */

import TelegramBot from "node-telegram-bot-api";
import { CommandAccessLevel, CommandDefinition } from "./index";
import {
  logger,
  apiClient,
  validateUsername,
  MessageTemplates,
  LogContext,
} from "../utils";

/**
 * Stats command handler
 * Fetches user stats from the API and formats them for display
 */
export const statsCommandHandler = async (
  bot: TelegramBot,
  msg: TelegramBot.Message,
  match: RegExpExecArray | null,
): Promise<void> => {
  const chatId = msg.chat.id;

  try {
    // Extract username from command
    const username = match && match[1] ? match[1].trim() : null;

    // If no username provided, check if the command issuer has a verified account
    if (!username) {
      const senderId = msg.from?.id;

      if (!senderId) {
        await bot.sendMessage(
          chatId,
          "Could not identify your Telegram ID. Please try again.",
        );
        return;
      }

      // TODO: In the future, look up the user's verified Goated account by Telegram ID
      await bot.sendMessage(
        chatId,
        "Please provide a Goated username to check stats for.\nExample: `/stats username`",
      );
      return;
    }

    // Validate username format
    if (!validateUsername(username)) {
      await bot.sendMessage(chatId, MessageTemplates.ERRORS.VALIDATION_ERROR);
      return;
    }

    // Show typing indicator
    await bot.sendChatAction(chatId, "typing");

    // Fetch user stats from API
    const stats = await fetchUserStats(username);

    if (!stats) {
      await bot.sendMessage(
        chatId,
        `Could not find statistics for user *${username}*. Please check the username and try again.`,
        { parse_mode: "Markdown" },
      );
      return;
    }

    // Format and send stats message
    const statsMessage = formatStatsMessage(username, stats);
    await bot.sendMessage(chatId, statsMessage, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
  } catch (error) {
    logger.error("Error in stats command", error as Error | LogContext);
    await bot.sendMessage(chatId, MessageTemplates.ERRORS.SERVER_ERROR);
  }
};

/**
 * Fetch user statistics from the API
 * @param username Goated username
 * @returns User statistics object or null if not found
 */
async function fetchUserStats(username: string): Promise<any | null> {
  try {
    // Use the apiClient's getGoatedStats method
    const response = await apiClient.getGoatedStats(username);
    return response;
  } catch (error) {
    logger.error(`Error fetching stats for ${username}`, {
      error: error instanceof Error ? error.message : String(error),
      username,
    });
    return null;
  }
}

/**
 * Format user statistics into a readable message
 * @param username Goated username
 * @param stats User statistics object
 * @returns Formatted message string
 */
function formatStatsMessage(username: string, stats: any): string {
  // Basic stats formatting
  return `
*Stats for ${username}*

🎮 *Games Played:* ${stats.gamesPlayed || 0}
💰 *Total Wagered:* $${formatNumber(stats.totalWagered || 0)}
💵 *Total Won:* $${formatNumber(stats.totalWon || 0)}
📊 *Win Rate:* ${calculateWinRate(stats.totalWon, stats.totalWagered)}%
🏆 *Biggest Win:* $${formatNumber(stats.biggestWin || 0)}

*Join Goated:* [goated.com/ref/${username}](https://goated.com/ref/${username})
  `.trim();
}

/**
 * Format a number with commas for thousands
 * @param num Number to format
 * @returns Formatted number string
 */
function formatNumber(num: number): string {
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Calculate win rate percentage
 * @param won Amount won
 * @param wagered Amount wagered
 * @returns Win rate percentage
 */
function calculateWinRate(won: number, wagered: number): string {
  if (!wagered || wagered === 0) return "0.00";
  const winRate = (won / wagered) * 100;
  return winRate.toFixed(2);
}

/**
 * Stats command definition
 */
export const statsCommand: CommandDefinition = {
  name: "stats",
  handler: statsCommandHandler,
  accessLevel: CommandAccessLevel.PUBLIC,
  description: "Check your Goated.com statistics",
  requiresArgs: false,
  enabled: true,
  showInHelp: true,
};

// Export the command to be registered with the registry
export default statsCommand;
