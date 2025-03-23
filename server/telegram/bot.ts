import TelegramBot from "node-telegram-bot-api";
import type {
  Message as TelegramMessage,
  ChatMember,
  ChatPermissions as TelegramChatPermissions,
} from "node-telegram-bot-api";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { users } from "../../db/schema";
import {
  telegramUsers,
  verificationRequests,
  challenges,
  challengeEntries,
} from "../../db/schema/telegram";
import { scheduleJob } from "node-schedule";
import { randomUUID } from "crypto";
import {
  logger,
  stateManager,
  BotConfig,
  MessageTemplates,
  LogContext,
} from "./utils";
import { validateConfig } from "./utils/config";
import { ApiError, ApiErrorType } from "./utils/api";

// Type declarations - keep minimal for now
type Message = TelegramMessage;
type ChatPermissions = TelegramChatPermissions;

logger.info("Loading bot module...");

// Singleton implementation with proper instance tracking
let botInstance: TelegramBot | null = null;
let isPolling = false;

// Config validation
if (!validateConfig()) {
  throw new Error("Invalid bot configuration");
}

logger.info("Token validation successful");

// Create bot instance with proper error handling
function createBot(): TelegramBot {
  if (botInstance) {
    logger.info("Using existing instance");
    return botInstance;
  }

  logger.info("Creating new bot instance...");

  if (!BotConfig.TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN must be provided");
  }

  // Create with polling disabled initially to avoid instant conflicts
  if (!BotConfig.TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN must be provided");
  }
  const bot = new TelegramBot(BotConfig.TOKEN, { polling: false });

  // Handle polling errors
  bot.on("polling_error", (error) => {
    logger.error("Polling error", {
      error: error.message,
      stack: error.stack,
    });

    // If we get a conflict error, stop polling to prevent cascading errors
    if (error.message.includes("409 Conflict")) {
      logger.warn("Detected polling conflict, stopping polling");
      bot.stopPolling().catch((e) => {
        logger.error("Error stopping polling after conflict", { error: e });
      });
      isPolling = false;

      // Wait and attempt to restart polling
      setTimeout(() => {
        if (!isPolling) {
          logger.info("Attempting to restart polling after conflict");
          startPolling(bot);
        }
      }, BotConfig.POLLING_RESTART_DELAY);
    }
  });

  // Store the instance
  botInstance = bot;
  return bot;
}

// Start polling with error handling
function startPolling(bot: TelegramBot): void {
  if (isPolling) {
    logger.info("Already polling, ignoring start request");
    return;
  }

  logger.info("Starting polling...");
  bot
    .startPolling({ restart: false })
    .then(() => {
      logger.info("Polling started successfully");
      isPolling = true;
    })
    .catch((error) => {
      logger.error("Failed to start polling", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      isPolling = false;

      // Try again after delay
      setTimeout(() => startPolling(bot), BotConfig.POLLING_RESTART_DELAY);
    });
}

// Initialize state manager
stateManager.init().catch((error) => {
  logger.error("Failed to initialize state manager", {
    error: error instanceof Error ? error.message : String(error),
  });
});

// Create and initialize the bot
const bot = createBot();
startPolling(bot);

// Simple ping command to verify bot is working
bot.onText(/\/ping/, (msg) => {
  console.log("[Telegram Bot] Received ping command");
  bot
    .sendMessage(msg.chat.id, "pong!")
    .then(() => {
      console.log("[Telegram Bot] Sent pong response");
    })
    .catch((err) => {
      console.error("[Telegram Bot] Error sending pong:", err);
    });
});

// Constants
const ADMIN_TELEGRAM_IDS = ["1689953605"];
const ALLOWED_GROUP_IDS = process.env.ALLOWED_GROUP_IDS?.split(",") || [];

// Define constants
const CONVERSATION_COOLDOWN = 10000; // 10 seconds between AI responses
const BEGGING_PATTERNS = {
  DIRECT: [
    "give me",
    "send me",
    "need money",
    "spare some",
    "can send?",
    "sen pls",
    "pls send",
    "send pls",
    "send coin",
    "gimme",
    "hook me up",
    "need help$",
  ],
  SUBTLE: [
    "broke",
    "poor",
    "help me out",
    "anything helps",
    "no money",
    "struggling",
    "desperate",
  ],
  SPAM: [
    "copy paste",
    "forwarded message",
    "chain message",
    "spam",
    "bulk message",
  ],
  SHARING: ["airdrop", "giveaway", "sharing", "giving away", "drop", "contest"],
} as const;

// Warning messages for begging
const BEGGING_WARNINGS = [
  "⚠️ @{username} Begging is not allowed in this group. Focus on participating in races and events instead!",
  "⚠️ Hey @{username}, we don't allow begging here. Try joining our monthly races to earn rewards!",
  "⚠️ @{username} This is a warning for begging. Join the community events instead of asking for handouts!",
  "⚠️ @{username} No begging allowed! Check /help to see how you can earn through races and challenges!",
] as const;

// Bot personality traits
const BOT_PERSONALITY = {
  FRIENDLY: ["Hey!", "Hi there!", "Hello!", "Sup!"],
  HELPFUL: [
    "Let me help you with that!",
    "I can assist with that!",
    "I got you!",
  ],
  PLAYFUL: ["😎", "🎮", "🎲"],
  CONGRATULATORY: ["Well done!", "Amazing!", "Great job!", "Fantastic!"],
} as const;

// Types for API responses
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface MonthlyData {
  monthly: {
    data: GoatedUser[];
  };
}

interface GoatedUser {
  id: string;
  name: string;
  wagered: {
    this_month: number;
    this_week: number;
    today: number;
    all_time: number;
  };
}

// Message scheduling types
interface RecurringMessage {
  id: string;
  message: string;
  schedule: string;
  chatId: number;
  enabled: boolean;
  targetGroups: string[];
}

// Message state tracking
interface MessageState {
  id: string;
  state: "active" | "inactive";
  lastRun?: number;
}

// Global state
declare global {
  var scheduledJobs: Map<string, any>;
  var recurringMessages: Map<string, RecurringMessage>;
  var activeChats: Map<
    number,
    {
      lastMessage: string;
      timestamp: number;
    }
  >;
}

// Initialize global state
if (!global.scheduledJobs) global.scheduledJobs = new Map();
if (!global.recurringMessages) global.recurringMessages = new Map();
if (!global.activeChats) global.activeChats = new Map();

// Helper functions
function getUniqueId(): string {
  return randomUUID();
}

function sanitizeText(text: string | undefined | null): string {
  if (!text) return "";
  return text.trim();
}

function validateText(
  text: string | undefined | null,
  error = "Text is required",
): string {
  const sanitized = sanitizeText(text);
  if (!sanitized) throw new Error(error);
  return sanitized;
}

export function validateUsername(username?: string | null): string {
  return validateText(username, "Username is required");
}

// Message and text validation helpers
function isBeggingMessage(text: string | undefined | null): boolean {
  const lowerText = sanitizeText(text).toLowerCase();

  if (BEGGING_PATTERNS.DIRECT.some((pattern) => lowerText.includes(pattern))) {
    return true;
  }

  if (BEGGING_PATTERNS.SUBTLE.some((pattern) => lowerText.includes(pattern))) {
    return true;
  }

  const currencyPattern =
    /[\$\€\£\¥]|([0-9]+\s*(dollars|euros|usd|coins|tips))/gi;
  const currencyMatches = lowerText.match(currencyPattern) || [];
  if (
    currencyMatches.length > 0 &&
    BEGGING_PATTERNS.SUBTLE.some((pattern) => lowerText.includes(pattern))
  ) {
    return true;
  }

  return false;
}

// Recurring message helpers
async function scheduleRecurringMessage(
  message: RecurringMessage,
): Promise<void> {
  try {
    const job = scheduleJob(message.schedule, async () => {
      if (!message.enabled) return;

      for (const groupId of message.targetGroups) {
        try {
          await bot.sendMessage(Number(groupId), message.message);
        } catch (error) {
          console.error(`Error sending message to group ${groupId}:`, error);
        }
      }
    });

    global.scheduledJobs.set(message.id, job);
    global.recurringMessages.set(message.id, message);
  } catch (error) {
    console.error("Error scheduling message:", error);
    throw error;
  }
}

// Message management functions
function createRecurringMessage(
  data: Partial<RecurringMessage> & { chatId: number },
): RecurringMessage {
  return {
    id: getUniqueId(),
    message: data.message || "",
    schedule: data.schedule || "0 * * * *",
    chatId: data.chatId,
    enabled: data.enabled ?? true,
    targetGroups: data.targetGroups || [],
  };
}

async function muteUser(
  chatId: number | string,
  userId: number,
  duration: number,
): Promise<void> {
  const untilDate = Math.floor(Date.now() / 1000) + duration;
  const targetChatId =
    typeof chatId === "string" ? parseInt(chatId, 10) : chatId;

  const mute = {
    until_date: untilDate,
    permissions: {
      can_send_messages: false,
      can_send_other_messages: false,
      can_add_web_page_previews: false,
      can_change_info: false,
      can_invite_users: false,
      can_pin_messages: false,
      can_send_polls: false,
    } as TelegramChatPermissions,
  };

  await bot.restrictChatMember(targetChatId, userId, mute);
}

// Command handlers
// Help command
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;

  let message = `🐐 *Welcome to Goated Stats Bot\\!*\n\n`;

  if (msg.from?.username === "xGoombas") {
    message += `*Admin Commands:*\n`;
    message += `• /broadcast \\- Send message to all users\n`;
    message += `• /group\\_message \\- Send message to group\n`;
    message += `• /user\\_info \\- Get user information\n`;
    message += `• /pending \\- View verification requests\n`;
    message += `• /verify\\_user \\- Verify a user\n`;
    message += `• /reject\\_user \\- Reject a verification\n`;
    message += `• /makeadmin \\- Grant admin privileges\n`;
    message += `• /adminpanel \\- Access the admin panel\n`;
    message += `• /mute @username duration \\- Mute a user\n`;
    message += `• /warn @username reason \\- Warn a user\n`;
    message += `• /ban @username reason \\- Ban a user\n\n`;
    message += `*Recurring Messages:*\n`;
    message += `• /add\\_recurring\\_message \\- Add a recurring message\n`;
    message += `• /list\\_recurring\\_messages \\- List recurring messages\n`;
    message += `• /remove\\_recurring\\_message \\- Remove a recurring message\n\n`;
  }

  message += `*Available Commands:*\n`;
  message += `• /start \\- Get started with the bot\n`;
  message += `• /verify \\- Link your Goated account\n`;
  message += `• /stats \\- View your wager statistics\n`;
  message += `• /check\\_stats \\- Check stats for username\n`;
  message += `• /race \\- Check your race position\n`;
  message += `• /leaderboard \\- See top players\n`;
  message += `• /play \\- Play on Goated with our link\n`;
  message += `• /website \\- Visit GoatedVIPs\\.gg\n\n`;
  message += `Need help? Contact @xGoombas for support\\.`;

  await bot.sendMessage(chatId, message, {
    parse_mode: "MarkdownV2",
  });
});

// Check stats command
bot.onText(/\/check_stats (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();
  const username = validateUsername(match?.[1]?.trim());

  if (!telegramId) {
    return bot.sendMessage(chatId, "Could not identify user.");
  }

  try {
    if (msg.from?.username !== "xGoombas") {
      const requester = await db
        .select()
        .from(telegramUsers)
        .where(eq(telegramUsers.telegramId, telegramId))
        .execute();

      if (
        !requester?.[0]?.isVerified ||
        requester[0].goatedUsername?.toLowerCase() !== username.toLowerCase()
      ) {
        return bot.sendMessage(
          chatId,
          "You can only check your own stats after verification.",
        );
      }
    }

    const apiUrl = new URL("http://0.0.0.0:5000/api/affiliate/stats");
    apiUrl.searchParams.append("username", username);

    const response = await fetch(apiUrl.toString(), {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    const data = (await response.json()) as ApiResponse<MonthlyData>;
    const transformedData = data?.data?.monthly?.data;
    let userStats = transformedData?.find(
      (u: GoatedUser) => u.name.toLowerCase() === username.toLowerCase(),
    );

    if (
      !userStats &&
      msg.from?.username === "xGoombas" &&
      username.startsWith("@")
    ) {
      const cleanUsername = username.substring(1);
      const telegramUser = await db
        .select()
        .from(telegramUsers)
        .where(eq(telegramUsers.telegramUsername, cleanUsername))
        .execute();

      if (telegramUser?.[0]?.goatedUsername) {
        userStats = transformedData?.find(
          (u: GoatedUser) =>
            u.name.toLowerCase() ===
            telegramUser[0].goatedUsername?.toLowerCase(),
        );
      }
    }

    if (!userStats) {
      return bot.sendMessage(chatId, "User not found.");
    }

    const message = `📊 Stats for ${userStats.name}:\n
Monthly Wager: $${(userStats.wagered?.this_month || 0).toLocaleString()}
Weekly Wager: $${(userStats.wagered?.this_week || 0).toLocaleString()}
Daily Wager: $${(userStats.wagered?.today || 0).toLocaleString()}
All-time Wager: $${(userStats.wagered?.all_time || 0).toLocaleString()}`;

    return bot.sendMessage(chatId, message);
  } catch (error) {
    console.error("Error checking stats:", error);
    return bot.sendMessage(chatId, "An error occurred while fetching stats.");
  }
});

// Admin commands
bot.onText(/\/makeadmin/, async (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from?.username;

  if (username !== "xGoombas") {
    return bot.sendMessage(
      chatId,
      "❌ Only authorized users can use this command.",
    );
  }

  try {
    const [user] = await db
      .update(users)
      .set({ isAdmin: true })
      .where(eq(users.username, username))
      .returning();

    if (user) {
      await bot.sendMessage(
        chatId,
        "✅ Admin privileges granted successfully!",
      );
    } else {
      await bot.sendMessage(
        chatId,
        "❌ Failed to grant admin privileges. Please try again.",
      );
    }
  } catch (error) {
    console.error("Error granting admin privileges:", error);
    await bot.sendMessage(
      chatId,
      "❌ An error occurred while granting admin privileges.",
    );
  }
});

// Admin command to reject a verification request
bot.onText(/\/reject_user (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const adminUsername = msg.from?.username;

  if (adminUsername !== "xGoombas") {
    return bot.sendMessage(
      chatId,
      "❌ Only authorized users can use this command.",
    );
  }

  if (!match?.[1]) {
    return bot.sendMessage(
      chatId,
      "❌ Please provide a Telegram username or ID.",
    );
  }

  let telegramId = match[1];
  // If username format is provided (@username), remove @ and find the user's ID
  if (telegramId.startsWith("@")) {
    telegramId = telegramId.substring(1);
    const user = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramUsername, telegramId))
      .execute();

    if (!user?.[0]) {
      return bot.sendMessage(chatId, "❌ User not found with that username.");
    }
    telegramId = user[0].telegramId;
  }

  try {
    // Update verification request status
    const [request] = await db
      .update(verificationRequests)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(verificationRequests.telegramId, telegramId))
      .returning();

    if (!request) {
      return bot.sendMessage(chatId, "❌ Verification request not found.");
    }

    // Notify user privately
    await bot.sendMessage(
      telegramId,
      "❌ Your verification request has been rejected.\n" +
        "Please ensure you're using the correct Goated username and try again.\n" +
        "If you need help, contact @xGoombas.",
    );

    return bot.sendMessage(
      chatId,
      `✅ User ${request.goatedUsername}'s verification request has been rejected.`,
    );
  } catch (error) {
    console.error("Error rejecting verification:", error);
    return bot.sendMessage(chatId, "❌ Error rejecting verification request.");
  }
});

// Admin command to broadcast message
bot.onText(/\/broadcast (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const adminUsername = msg.from?.username;

  if (adminUsername !== "xGoombas") {
    return bot.sendMessage(
      chatId,
      "❌ Only authorized users can use this command.",
    );
  }

  if (!match?.[1]) {
    return bot.sendMessage(chatId, "❌ Please provide a message to broadcast.");
  }

  const message = match[1];
  try {
    const users = await db.select().from(telegramUsers).execute();
    let successCount = 0;
    let failureCount = 0;

    for (const user of users) {
      try {
        await bot.sendMessage(user.telegramId, message);
        successCount++;
      } catch (error) {
        console.error(`Failed to send to ${user.telegramId}:`, error);
        failureCount++;
      }
    }

    return bot.sendMessage(
      chatId,
      `📢 Broadcast complete!\n✅ Sent: ${successCount}\n❌ Failed: ${failureCount}`,
    );
  } catch (error) {
    console.error("Error broadcasting message:", error);
    return bot.sendMessage(chatId, "❌ Error broadcasting message.");
  }
});

// Check bot status - this can be useful for debugging
export async function getBotStatus() {
  return {
    isPolling,
    hasInstance: !!botInstance,
    uptime: process.uptime(),
    token: !!BotConfig.TOKEN,
    commands: await bot.getMyCommands(),
  };
}

// Export bot instance and stop function
export default bot;

// Stop the bot and clean up resources
export async function stopBot() {
  try {
    logger.info("Stopping polling...");
    if (botInstance && isPolling) {
      await bot.stopPolling();
      logger.info("Polling stopped");
      isPolling = false;
    }
  } catch (error) {
    logger.error("Error stopping polling", { error });
  }
}

// Handle cleanup on server shutdown
process.on("SIGINT", stopBot);
process.on("SIGTERM", stopBot);
