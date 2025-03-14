/**
 * Command registration for the Telegram bot
 * Centralizes command registration logic
 */

import TelegramBot from "node-telegram-bot-api";
import { commandRegistry } from "./index";
import { logger } from "../utils";

// Import all commands
import helpCommand from "./help";
import statsCommand from "./stats";
import verifyCommand from "./verify";
import verifyUserCommand, { listRequestsCommand } from "./verify-user";
import leaderboardCommand, { raceCommand } from "./leaderboard";
import {
  createChallengeCommand,
  listChallengesCommand,
  viewChallengeCommand,
  updateChallengeStatusCommand,
} from "./challenge";
import {
  challengeEntryCommand,
  listEntriesCommand,
  verifyEntryCommand,
  reviewEntryCommand,
  myEntriesCommand,
} from "./challenge-entry";

// Add more command imports here as they are created

/**
 * Register all commands with the registry
 */
export function registerCommands(): void {
  logger.info("Registering bot commands...");

  // Register individual commands
  commandRegistry.register(helpCommand);
  commandRegistry.register(statsCommand);
  commandRegistry.register(verifyCommand);

  // Register admin commands
  commandRegistry.register(verifyUserCommand);
  commandRegistry.register(listRequestsCommand);

  // Register leaderboard commands
  commandRegistry.register(leaderboardCommand);
  commandRegistry.register(raceCommand);

  // Register challenge commands
  commandRegistry.register(createChallengeCommand);
  commandRegistry.register(listChallengesCommand);
  commandRegistry.register(viewChallengeCommand);
  commandRegistry.register(updateChallengeStatusCommand);

  // Register challenge entry commands
  commandRegistry.register(challengeEntryCommand);
  commandRegistry.register(listEntriesCommand);
  commandRegistry.register(verifyEntryCommand);
  commandRegistry.register(reviewEntryCommand);
  commandRegistry.register(myEntriesCommand);

  // Register additional commands here

  logger.info(
    `Registered ${commandRegistry.getAllCommands().size} commands successfully`,
  );
}

/**
 * Initialize bot commands
 * @param bot Telegram bot instance
 */
export function initializeCommands(bot: TelegramBot): void {
  try {
    // Register commands with registry
    registerCommands();

    // Register commands with bot
    commandRegistry.registerWithBot(bot);

    // Set up bot menu commands
    const botCommands = Array.from(commandRegistry.getAllCommands().values())
      .filter((cmd) => cmd.enabled && cmd.showInHelp)
      .map((cmd) => ({
        command: cmd.name,
        description: cmd.description,
      }));

    // Set commands in Telegram interface
    bot
      .setMyCommands(botCommands)
      .then(() => logger.info("Bot menu commands set successfully"))
      .catch((err) =>
        logger.error("Failed to set bot menu commands", {
          error: err instanceof Error ? err.message : String(err),
        }),
      );

    logger.info("Bot commands initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize bot commands", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// Export for use in bot initialization
export default initializeCommands;
