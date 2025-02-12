import TelegramBot from "node-telegram-bot-api";
import { db } from "@db";
import { telegramUsers, verificationRequests } from "@db/schema/telegram";
import { users } from "@db/schema";
import { API_CONFIG } from "../config/api";
import { eq } from "drizzle-orm";
import fetch from "node-fetch";
import { transformLeaderboardData } from "../utils/leaderboard";

// Enhanced debugging
const DEBUG = true;
const BOT_ADMIN_ID = process.env.TELEGRAM_ADMIN_ID ? parseInt(process.env.TELEGRAM_ADMIN_ID) : 1689953605;

const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log("[Telegram Bot Debug]", ...args);
  }
};

// Rate limiting setup
const messageRateLimiter = new Map<number, number>();
const RATE_LIMIT_WINDOW = 1000; // 1 second

// Format helpers
const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  });
};

// Bot configuration
let bot: TelegramBot | null = null;
let isReconnecting = false;
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectAttempts = 0;

// Enhanced bot health monitoring
const MAX_HEALTH_CHECK_FAILURES = 3;
let healthCheckFailures = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const HEALTH_CHECK_TIMEOUT = 10000; // 10 seconds

// Bot health monitoring
let lastPingTime = Date.now();

// Initialize bot with enhanced error handling
const initializeBot = () => {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error("❌ TELEGRAM_BOT_TOKEN is not set in environment variables!");
    return null;
  }

  try {
    debugLog("Initializing bot with token:", process.env.TELEGRAM_BOT_TOKEN.slice(0, 10) + "...");

    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
      polling: {
        interval: 300,
        autoStart: true,
        params: {
          timeout: 10,
          allowed_updates: ["message", "callback_query"],
        }
      },
      filepath: false,
    });

    setupBotEventHandlers();
    setupCommandHandlers();
    startHealthCheck();

    return bot;
  } catch (error) {
    console.error("Failed to initialize bot:", error);
    return null;
  }
};

const startHealthCheck = () => {
  if (!bot) return;

  setInterval(async () => {
    try {
      const startTime = Date.now();
      const response = await bot.getMe();
      lastPingTime = Date.now();

      if (response) {
        healthCheckFailures = 0;
        debugLog("Health check passed");
      }

      // Check for timeout
      if (Date.now() - startTime > HEALTH_CHECK_TIMEOUT) {
        throw new Error("Health check timeout");
      }
    } catch (error) {
      console.error("Health check error:", error);
      healthCheckFailures++;
      debugLog(`Health check failed (${healthCheckFailures}/${MAX_HEALTH_CHECK_FAILURES})`);

      if (healthCheckFailures >= MAX_HEALTH_CHECK_FAILURES) {
        debugLog("Maximum health check failures reached - Attempting reconnection");
        await handleReconnection();
      }
    }
  }, HEALTH_CHECK_INTERVAL);
};

const setupBotEventHandlers = () => {
  if (!bot) return;

  // Connection verification
  bot.getMe().then((botInfo) => {
    console.log(`✅ Bot connected successfully as @${botInfo.username}`);
    debugLog("Full bot info:", JSON.stringify(botInfo, null, 2));
    reconnectAttempts = 0;
    lastPingTime = Date.now();
  }).catch((error) => {
    console.error("❌ Failed to connect bot:", error.message);
    handleReconnection();
  });

  // Enhanced error handling for polling
  bot.on("polling_error", (error: any) => {
    console.error("⚠️ Polling Error:", {
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });

    if (error.code === 401) {
      console.error("❌ Authentication failed. Please check your TELEGRAM_BOT_TOKEN");
    } else if (error.code === 409) {
      console.error("❌ Conflict: Another bot instance is running");
    }

    handleReconnection();
  });

  // Enhanced general error handling
  bot.on("error", (error: Error) => {
    console.error("⚠️ Telegram Bot Error:", {
      message: error.message,
      stack: error.stack,
      time: new Date().toISOString()
    });
    handleReconnection();
  });

  // Message monitoring
  bot.on("message", (msg) => {
    lastPingTime = Date.now();
    debugLog("📨 Received message:", {
      chatId: msg.chat.id,
      text: msg.text,
      from: msg.from?.username,
      timestamp: new Date().toISOString()
    });
  });
};

const handleReconnection = async () => {
  if (!bot || isReconnecting || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;

  isReconnecting = true;
  reconnectAttempts++;

  console.log(`🔄 Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);

  try {
    // Stop current polling
    await bot.stopPolling();

    // Clear any existing webhooks
    if (process.env.TELEGRAM_BOT_TOKEN) {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/deleteWebhook`);
      debugLog("Cleared existing webhook configuration");
    }

    // Wait before attempting reconnection
    await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY));

    // Start new polling session
    await bot.startPolling({
      polling: {
        interval: 300,
        autoStart: true,
        params: {
          timeout: 10,
          allowed_updates: ["message", "callback_query"],
        }
      }
    });

    isReconnecting = false;
    healthCheckFailures = 0;
    console.log("✅ Reconnection successful");
  } catch (error) {
    console.error("❌ Reconnection failed:", error);
    isReconnecting = false;

    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      setTimeout(() => handleReconnection(), RECONNECT_DELAY);
    } else {
      console.error("❌ Max reconnection attempts reached. Manual intervention required.");
      // Notify admin about the failure
      safeSendMessage(BOT_ADMIN_ID, "⚠️ Bot reconnection failed after maximum attempts. Please check the logs.");
    }
  }
};

// Safe message sending with rate limiting and error handling
const safeSendMessage = async (chatId: number, text: string, options = {}) => {
  if (!bot) return;

  try {
    const now = Date.now();
    const lastMessageTime = messageRateLimiter.get(chatId) || 0;

    if (now - lastMessageTime < RATE_LIMIT_WINDOW) {
      debugLog(`Rate limit applied for chat: ${chatId}`);
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_WINDOW));
    }

    messageRateLimiter.set(chatId, now);
    return await bot.sendMessage(chatId, text, { ...options, disable_web_page_preview: true });
  } catch (error: any) {
    console.error("Error sending message to", chatId, ":", error.message);
    try {
      return await bot.sendMessage(chatId, text.replace(/[<>]/g, "").trim(), {
        ...options,
        parse_mode: undefined,
        disable_web_page_preview: true,
      });
    } catch (secondError: any) {
      console.error(`Failed to send even a simplified message to ${chatId}:`, secondError.message);
    }
  }
};

// Setup command handlers
const setupCommandHandlers = () => {
  if (!bot) return;

  // Start command
  bot.onText(/\/start/, async (msg) => {
    debugLog("📝 Start command received from:", msg.chat.id);
    await safeSendMessage(msg.chat.id, "🎮 Welcome to GoatedVIPs Affiliate Bot!\nUse /verify to link your account.");
  });

  // Help command
  bot.onText(/\/help/, async (msg) => {
    debugLog("📝 Help command received from:", msg.chat.id);
    const helpText = `
Available commands:
/start - Start the bot
/help - Show this help message
/verify <username> - Link your platform account
/stats - View your statistics
/leaderboard - View top players
/play - Get game link
/website - Get website link
/approve @username - Approve verification request (Admin only)
`.trim();
    await safeSendMessage(msg.chat.id, helpText);
  });

  // Play command
  bot.onText(/\/play/, async (msg) => {
    debugLog("📝 Play command received from:", msg.chat.id);
    await safeSendMessage(msg.chat.id, "🎮 Play on Goated: https://goatedvips.gg/?ref=telegram");
  });

  // Website command
  bot.onText(/\/website/, async (msg) => {
    debugLog("📝 Website command received from:", msg.chat.id);
    await safeSendMessage(msg.chat.id, "🌐 Visit: https://goatedvips.gg");
  });

  // Verify command with enhanced error handling and proper API validation
  bot.onText(/\/verify (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    debugLog("📝 Verify command received from:", chatId);
    const username = match?.[1]?.trim();
    if (!username) return safeSendMessage(chatId, "Usage: /verify your_platform_username");

    try {
      const existingUser = await db
        .select()
        .from(telegramUsers)
        .where(eq(telegramUsers.telegramId, chatId.toString()))
        .limit(1);

      if (existingUser.length > 0 && existingUser[0].isVerified) {
        return safeSendMessage(chatId, "✅ Already verified!");
      }

      // Validate username against external API
      const response = await fetch(
        `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.API_TOKEN || API_CONFIG.token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        return safeSendMessage(chatId, "❌ Error verifying username. Please try again later.");
      }

      const apiData = await response.json();
      const transformedData = transformLeaderboardData(apiData);
      const userExists = transformedData.data.monthly.data.some(
        (p: any) => p.name.toLowerCase() === username.toLowerCase()
      );

      if (!userExists) {
        return safeSendMessage(chatId, "❌ Username not found. Please check the username and try again.");
      }

      // Find or create user in our database
      let [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user) {
        const [insertedUser] = await db
          .insert(users)
          .values({
            username: username,
            email: `${username}@placeholder.com`,
            password: 'placeholder',
            isAdmin: false
          })
          .returning();
        user = insertedUser;
      }

      // Create verification request
      await db.insert(verificationRequests).values({
        telegramId: chatId.toString(),
        userId: user.id,
        status: "pending",
        telegramUsername: msg.from?.username || null,
      });

      await safeSendMessage(chatId, "✅ Verification request submitted. An admin will review it shortly.");
      await safeSendMessage(BOT_ADMIN_ID, `🔔 New Verification Request:
Username: ${username}
Telegram: @${msg.from?.username || 'N/A'}
Chat ID: ${chatId}`);
    } catch (error) {
      console.error("Verification error:", error);
      await safeSendMessage(chatId, "❌ Error processing verification. Please try again later.");
    }
  });

  // Handle admin verification commands
  bot.onText(/\/approve (.+)/, async (msg, match) => {
    if (msg.chat.id !== BOT_ADMIN_ID) { // Admin-only command
      return safeSendMessage(msg.chat.id, "❌ This command is only available to administrators.");
    }

    const telegramUsername = match?.[1]?.trim().replace('@', '');
    if (!telegramUsername) return safeSendMessage(msg.chat.id, "Usage: /approve @username");

    try {
      const [request] = await db
        .select()
        .from(verificationRequests)
        .where(eq(verificationRequests.telegramUsername, telegramUsername))
        .limit(1);

      if (!request) {
        return safeSendMessage(msg.chat.id, "❌ No pending verification request found for this user.");
      }

      // Update verification request status
      await db
        .update(verificationRequests)
        .set({ status: "approved" })
        .where(eq(verificationRequests.telegramUsername, telegramUsername));

      // Create or update telegram user record
      await db.insert(telegramUsers).values({
        telegramId: request.telegramId,
        telegramUsername: telegramUsername,
        userId: request.userId,
        isVerified: true,
      }).onConflictDoUpdate({
        target: [telegramUsers.telegramId],
        set: {
          telegramUsername: telegramUsername,
          userId: request.userId,
          isVerified: true,
        }
      });

      // Get user info for confirmation message
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, request.userId))
        .limit(1);

      await safeSendMessage(msg.chat.id, `✅ Verified @${telegramUsername} as ${user.username}`);
      await safeSendMessage(parseInt(request.telegramId), "✅ Your account has been verified! You can now use /stats to check your statistics.");
    } catch (error) {
      console.error("Approval error:", error);
      await safeSendMessage(msg.chat.id, "❌ Error processing approval.");
    }
  });

  // Enhanced stats command with all time periods
  bot.onText(/\/stats/, async (msg) => {
    const chatId = msg.chat.id;
    debugLog("📝 Stats command received from:", chatId);
    try {
      const [telegramUser] = await db
        .select()
        .from(telegramUsers)
        .where(eq(telegramUsers.telegramId, chatId.toString()))
        .limit(1);

      if (!telegramUser?.isVerified) {
        return safeSendMessage(chatId, "❌ Please verify your account using /verify");
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, telegramUser.userId))
        .limit(1);

      const response = await fetch(
        `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.API_TOKEN || API_CONFIG.token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch stats");

      const rawData = await response.json();
      const transformedData = transformLeaderboardData(rawData);
      const userStats = transformedData.data.monthly.data.find(
        (p: any) => p.name.toLowerCase() === user.username.toLowerCase()
      );

      if (!userStats) {
        return safeSendMessage(chatId, "❌ No stats found for your account this period.");
      }

      const position = transformedData.data.monthly.data.findIndex(
        (p: any) => p.name.toLowerCase() === user.username.toLowerCase()
      ) + 1;


      const statsMessage = `📊 Stats for ${user.username}:
💰 Today: $${formatCurrency(userStats.wagered.today)}
📅 This Week: $${formatCurrency(userStats.wagered.this_week)}
📆 This Month: $${formatCurrency(userStats.wagered.this_month)}
🏆 All Time: $${formatCurrency(userStats.wagered.all_time)}
📍 Monthly Race Position: #${position}`;

      await safeSendMessage(chatId, statsMessage);
    } catch (error) {
      console.error("Stats error:", error);
      await safeSendMessage(chatId, "❌ Error fetching stats. Try again later.");
    }
  });

  // Enhanced leaderboard command with proper formatting
  bot.onText(/\/leaderboard/, async (msg) => {
    const chatId = msg.chat.id;
    debugLog("📝 Leaderboard command received from:", chatId);

    try {
      debugLog("Fetching leaderboard data...");
      const response = await fetch(
        `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.API_TOKEN || API_CONFIG.token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard: ${response.status}`);
      }

      const rawData = await response.json();
      const transformedData = transformLeaderboardData(rawData);

      if (!transformedData.data.monthly.data.length) {
        return safeSendMessage(chatId, "❌ No leaderboard data available.");
      }

      const PRIZE_POOL = 500;

      // Get verified users for tagging
      const verifiedUsersQuery = await db
        .select({
          username: users.username,
          telegramUsername: telegramUsers.telegramUsername
        })
        .from(users)
        .innerJoin(telegramUsers, eq(users.id, telegramUsers.userId))
        .where(eq(telegramUsers.isVerified, true));

      const verifiedUsers = new Map(
        verifiedUsersQuery.map(user => [
          user.username.toLowerCase(),
          user.telegramUsername
        ])
      );

      debugLog(`Found ${verifiedUsers.size} verified users`);

      // Format leaderboard entries with proper spacing
      const formatLeaderboardEntry = (player: any, position: number): string => {
        const telegramTag = verifiedUsers.get(player.name.toLowerCase());
        const displayName = telegramTag ? `@${telegramTag}` : player.name;
        const wagered = formatCurrency(player.wagered.this_month);
        const paddedPosition = position.toString().padStart(2, ' ');
        const paddedWagered = wagered.padStart(12, ' ');
        return `${paddedPosition}. ${displayName}\n    💰 $${paddedWagered}`;
      };

      const top10 = transformedData.data.monthly.data
        .slice(0, 10)
        .map((player: any, index: number) => formatLeaderboardEntry(player, index + 1))
        .join("\n\n");

      const message = `🏆 Monthly Race Leaderboard
💵 Prize Pool: $${PRIZE_POOL}
🏁 Current Top 10:\n\n${top10}\n\n📊 Updated: ${new Date().toLocaleString()}`;

      // Create inline keyboard with buttons
      const inlineKeyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "📊 My Stats", callback_data: "my_stats" },
              { text: "🔄 Refresh", callback_data: "refresh_leaderboard" }
            ]
          ]
        }
      };

      await safeSendMessage(chatId, message, inlineKeyboard);
    } catch (error) {
      console.error("Leaderboard error:", error);
      await safeSendMessage(chatId, "❌ Error fetching leaderboard. Please try again later.");
    }
  });

  // Handle callback queries from inline buttons
  bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message?.chat.id;
    if (!chatId) return;

    try {
      switch (callbackQuery.data) {
        case 'my_stats':
          // Simulate /stats command
          await bot.emit('message', {
            ...callbackQuery.message,
            text: '/stats',
            entities: [{ offset: 0, length: 6, type: 'bot_command' }]
          });
          break;
        case 'refresh_leaderboard':
          // Simulate /leaderboard command
          await bot.emit('message', {
            ...callbackQuery.message,
            text: '/leaderboard',
            entities: [{ offset: 0, length: 11, type: 'bot_command' }]
          });
          break;
      }
      // Answer callback query to remove loading state
      await bot.answerCallbackQuery(callbackQuery.id);
    } catch (error) {
      console.error('Callback query error:', error);
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: '❌ Error processing request',
        show_alert: true
      });
    }
  });
};

// Initialize and export the bot instance
const botInstance = initializeBot();

// Export the bot instance and helper functions
export { botInstance as bot, safeSendMessage, initializeBot };