/**
 * Standalone Telegram Bot Service
 * Handles bot initialization, command processing, and API integration
 */

import TelegramBot from "node-telegram-bot-api";
import { z } from "zod";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { log } from "../server/utils/logger";
import { CommandConfig, MessageTemplates, BotError, BotErrorType } from "./config/bot-config";
import { wagerRaces } from "../db/schema";
import { desc } from "drizzle-orm";

// Configuration validation
const ConfigSchema = z.object({
  botToken: z.string(),
  dbUrl: z.string().url(),
});

type Config = z.infer<typeof ConfigSchema>;

// Load and validate configuration
function loadConfig(): Config {
  const config = {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    dbUrl: process.env.DATABASE_URL || '',
  };

  return ConfigSchema.parse(config);
}

class StandaloneTelegramBot {
  private bot: TelegramBot;
  private config: Config;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.config = loadConfig();
    this.bot = this.initializeBot();
  }

  private initializeBot(): TelegramBot {
    // Initialize bot with polling mode
    const bot = new TelegramBot(this.config.botToken, {
      polling: true
    });

    log("info", "Bot initialized in polling mode");
    this.setupCommandHandlers(bot);
    return bot;
  }

  private async getLeaderboard(): Promise<string> {
    try {
      const leaderboardData = await db.query.wagerRaces.findMany({
        orderBy: [desc(wagerRaces.createdAt)],
        limit: 10,
        with: {
          participants: {
            with: {
              user: true
            }
          }
        }
      });

      if (!leaderboardData.length) {
        return "No races found in the leaderboard.";
      }

      const leaderboardText = leaderboardData
        .map((race, index) => {
          const topParticipant = race.participants?.[0];
          return `${index + 1}. Race ID: ${race.id}\n` +
                 `   Winner: ${topParticipant?.user?.username || 'Unknown'}\n` +
                 `   Prize Pool: $${race.prizePool}\n`;
        })
        .join('\n');

      return `🏆 Top 10 Recent Races:\n\n${leaderboardText}`;
    } catch (error) {
      log("error", `Failed to fetch leaderboard: ${error instanceof Error ? error.message : String(error)}`);
      throw new BotError(BotErrorType.DATABASE, "Failed to fetch leaderboard");
    }
  }

  private setupCommandHandlers(bot: TelegramBot) {
    // Base command handlers
    bot.onText(/\/start/, async (msg) => {
      try {
        await bot.sendMessage(msg.chat.id, MessageTemplates.welcome);
      } catch (error) {
        log("error", `Failed to send welcome message: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    bot.onText(/\/help/, async (msg) => {
      try {
        await bot.sendMessage(msg.chat.id, MessageTemplates.help);
      } catch (error) {
        log("error", `Failed to send help message: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    // Leaderboard command
    bot.onText(/\/leaderboard/, async (msg) => {
      try {
        const leaderboard = await this.getLeaderboard();
        await bot.sendMessage(msg.chat.id, leaderboard);
      } catch (error) {
        const errorMessage = error instanceof BotError ? 
          error.message : 
          MessageTemplates.error.general;
        await bot.sendMessage(msg.chat.id, errorMessage);
      }
    });

    // Status command
    bot.onText(/\/status/, async (msg) => {
      try {
        await db.execute(sql`SELECT 1`);
        const status = "✅ Bot is running\n✅ Database is connected\n✅ Polling is active";
        await bot.sendMessage(msg.chat.id, status);
      } catch (error) {
        log("error", `Status check failed: ${error instanceof Error ? error.message : String(error)}`);
        await bot.sendMessage(msg.chat.id, "❌ System is experiencing issues. Please try again later.");
      }
    });

    // Error handling for polling errors
    bot.on('polling_error', (error) => {
      log("error", `Polling error: ${error instanceof Error ? error.message : String(error)}`);
    });

    // Handle connection errors
    bot.on('error', (error) => {
      log("error", `Bot error: ${error instanceof Error ? error.message : String(error)}`);
    });
  }

  async start() {
    try {
      // Test database connection
      await db.execute(sql`SELECT 1`);
      log("info", "Database connection successful");

      log("info", "Bot service started successfully");
    } catch (error) {
      log("error", `Failed to start bot service: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  async stop() {
    try {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
      }
      // Stop polling
      await this.bot.stopPolling();
      log("info", "Bot service stopped");
    } catch (error) {
      log("error", `Error stopping bot service: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Start the bot service
const botService = new StandaloneTelegramBot();
botService.start().catch(console.error);

// Handle graceful shutdown
process.on('SIGTERM', () => botService.stop());
process.on('SIGINT', () => botService.stop());