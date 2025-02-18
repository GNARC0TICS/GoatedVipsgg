/**
 * Bot Configuration
 * Centralizes bot-specific configuration and type definitions
 */

import { z } from "zod";

// Command configuration
export const CommandConfig = {
  LEADERBOARD_UPDATE_INTERVAL: 5 * 60 * 1000, // 5 minutes
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
};

// Bot command schemas
export const CommandSchema = z.object({
  type: z.enum(['START', 'HELP', 'LEADERBOARD', 'STATUS']),
  chatId: z.number(),
  userId: z.number().optional(),
  params: z.record(z.string()).optional(),
});

export type BotCommand = z.infer<typeof CommandSchema>;

// Error types
export enum BotErrorType {
  TELEGRAM_API = 'TELEGRAM_API',
  DATABASE = 'DATABASE',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN',
}

// Custom error class for bot operations
export class BotError extends Error {
  constructor(
    public type: BotErrorType,
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'BotError';
  }
}

// Response templates
export const MessageTemplates = {
  welcome: `Welcome to GoatedVIPs Bot! 🎮
Use /help to see available commands.`,
  
  help: `Available Commands:
/start - Start the bot
/help - Show this help message
/leaderboard - View current leaderboard
/status - Check bot status

For support, contact @GoatedAdmin`,

  error: {
    general: "An error occurred. Please try again later.",
    invalidCommand: "Invalid command. Use /help to see available commands.",
    maintenance: "Bot is currently under maintenance. Please try again later.",
  }
};
