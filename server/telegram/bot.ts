import { z } from "zod";
import TelegramBot from "node-telegram-bot-api";
import fetch from "node-fetch";
import { db } from "@db";
import { telegramUsers, verificationRequests } from "@db/schema/telegram";
import { users } from "@db/schema/users";
import { eq } from "drizzle-orm";
import type { Request, Response } from "express";

let botInstance: TelegramBot | null = null;
let healthCheckInterval: NodeJS.Timeout | null = null;

/**
 * Initializes the Telegram bot with the provided token
 * Sets up webhooks and event handlers
 */
export async function initializeBot(): Promise<TelegramBot | null> {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error("❌ TELEGRAM_BOT_TOKEN is not set!");
    return null;
  }

  try {
    botInstance = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
    const botInfo = await botInstance.getMe();
    console.log("✅ Bot initialized successfully");
    startHealthCheck(); // Start monitoring after initialization
    return botInstance;
  } catch (error) {
    console.error("❌ Bot initialization failed:", error);
    botInstance = null;
    return null;
  }
}

// Safe message sending with rate limiting and error handling
async function safeSendMessage(
  chatId: number,
  text: string,
  options: any = {},
  priority: "high" | "medium" | "low" = "medium"
): Promise<void> {
  if (!botInstance) return;

  try {
    await botInstance.sendMessage(chatId, text, options);
  } catch (error) {
    console.error(`Failed to send message to ${chatId}:`, error);
  }
}

// Handle verification command
async function handleVerifyCommand(msg: any, args: string[]) {
  const chatId = msg.chat.id;
  try {
    const username = args[0]?.replace("@", "");
    if (!username) {
      return safeSendMessage(chatId, "Usage: /verify your-username");
    }

    // Check if already verified
    const [existingUser] = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramUsername, username))
      .limit(1);

    if (existingUser) {
      return safeSendMessage(chatId, "❌ This Telegram account is already verified.");
    }

    // Create verification request
    await db.insert(verificationRequests).values({
      telegramId: msg.from.id.toString(),
      telegramUsername: username,
      userId: username, // Temporary, will be updated by admin
      status: "pending"
    });

    await safeSendMessage(chatId, "✅ Verification request submitted! Please wait for admin approval.");
  } catch (error) {
    console.error("Verification error:", error);
    await safeSendMessage(chatId, "❌ Error processing verification request.");
  }
}

// Handle stats command
async function handleStatsCommand(msg: any) {
  const chatId = msg.chat.id;
  try {
    const [user] = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramId, msg.from.id.toString()))
      .limit(1);

    if (!user || !user.isVerified) {
      return safeSendMessage(chatId, "❌ You need to verify your account first using /verify");
    }

    await safeSendMessage(chatId, "📊 Your stats will be displayed here");
  } catch (error) {
    console.error("Stats error:", error);
    await safeSendMessage(chatId, "❌ Error fetching stats.");
  }
}

// Handle leaderboard command
async function handleLeaderboardCommand(msg: any) {
  const chatId = msg.chat.id;
  try {
    await safeSendMessage(chatId, "🏆 Leaderboard will be displayed here");
  } catch (error) {
    console.error("Leaderboard error:", error);
    await safeSendMessage(chatId, "❌ Error fetching leaderboard.");
  }
}

// Handle verification action (approve/reject)
async function handleVerificationAction(msg: any, action: 'approve' | 'reject', username: string) {
  const chatId = msg.chat.id;
  try {
    const [request] = await db
      .select()
      .from(verificationRequests)
      .where(eq(verificationRequests.telegramUsername, username))
      .limit(1);

    if (!request) {
      return safeSendMessage(chatId, "❌ No pending verification request found for this user.");
    }

    await db
      .update(verificationRequests)
      .set({ status: action })
      .where(eq(verificationRequests.telegramUsername, username));

    if (action === 'approve') {
      await db
        .insert(telegramUsers)
        .values({
          telegramId: request.telegramId,
          telegramUsername: username,
          userId: request.userId,
          isVerified: true,
        })
        .onConflictDoUpdate({
          target: [telegramUsers.telegramId],
          set: {
            telegramUsername: username,
            userId: request.userId,
            isVerified: true,
          },
        });
    }

    await safeSendMessage(chatId, `✅ Verification request ${action}ed for @${username}`);
    await safeSendMessage(parseInt(request.telegramId), 
      action === 'approve' 
        ? "✅ Your account has been verified! You can now use /stats to check your statistics."
        : "❌ Your verification request has been rejected. Please contact support if you think this is a mistake."
    );
  } catch (error) {
    console.error(`Verification ${action} error:`, error);
    await safeSendMessage(chatId, `❌ Error processing verification ${action}.`);
  }
}

// Health check function
function startHealthCheck() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }

  healthCheckInterval = setInterval(async () => {
    if (!botInstance) return;

    try {
      await botInstance.getMe();
      console.log("✅ Bot health check passed");
    } catch (error) {
      console.error("❌ Bot health check failed:", error);
      await initializeBot();
    }
  }, 60000); // Check every minute
}

export function handleUpdate(update: TelegramBot.Update) {
  if (!botInstance) return;

  try {
    if (update.message) {
      botInstance.emit("message" as any, update.message);
    } else if (update.callback_query) {
      botInstance.emit("callback_query" as any, update.callback_query);
    }
  } catch (error) {
    console.error("Error handling update:", error);
  }
}

export {
  botInstance as bot,
  handleVerifyCommand,
  handleStatsCommand,
  handleLeaderboardCommand,
  handleVerificationAction,
};