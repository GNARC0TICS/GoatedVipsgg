/**
 * Help command for the Telegram bot
 * Provides information about available commands
 */

import TelegramBot from "node-telegram-bot-api";
import {
  CommandAccessLevel,
  CommandDefinition,
  commandRegistry,
} from "./index";
import { logger } from "../utils";

/**
 * Help command handler
 * Responds with a formatted list of available commands based on user's access level
 */
export const helpCommandHandler = async (
  bot: TelegramBot,
  msg: TelegramBot.Message,
  match: RegExpExecArray | null,
): Promise<void> => {
  logger.info(`Help command executed by ${msg.from?.username || "unknown"}`);

  try {
    // Get formatted help message
    const helpMessage = commandRegistry.formatHelpMessage(msg);

    // Send help message with Markdown formatting
    await bot.sendMessage(msg.chat.id, helpMessage, {
      parse_mode: "MarkdownV2",
    });
  } catch (error) {
    logger.error("Error sending help message", {
      error: error instanceof Error ? error.message : String(error),
      userId: msg.from?.id,
      username: msg.from?.username,
      chatId: msg.chat.id,
    });
    await bot.sendMessage(
      msg.chat.id,
      "❌ An error occurred while generating the help message. Please try again later.",
    );
  }
};

/**
 * Help command definition
 */
export const helpCommand: CommandDefinition = {
  name: "help",
  handler: helpCommandHandler,
  accessLevel: CommandAccessLevel.PUBLIC,
  description: "Show available commands and information",
  requiresArgs: false,
  enabled: true,
  showInHelp: true,
};

// Export the command to be registered with the registry
export default helpCommand;
