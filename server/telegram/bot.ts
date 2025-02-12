import TelegramBot from "node-telegram-bot-api";
import { db } from "@db";
import { telegramUsers, verificationRequests } from "@db/schema/telegram";
import { users } from "@db/schema";
import { API_CONFIG } from "../config/api";
import { eq } from "drizzle-orm";
import fetch from "node-fetch";
import { transformLeaderboardData } from "../utils/leaderboard";

// Enhanced debug logging configuration
const DEBUG = process.env.NODE_ENV !== 'production';
const BOT_ADMIN_ID = process.env.TELEGRAM_ADMIN_ID ? parseInt(process.env.TELEGRAM_ADMIN_ID) : 1689953605;

// Improved debug logging with environment awareness
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log("[Telegram Bot Debug]", ...args);
  } else if (args[0]?.includes('Error') || args[0]?.includes('❌')) {
    console.error("[Telegram Bot Error]", ...args);
  }
};

// Rate limiting setup with enhanced queue management
const messageRateLimiter = new Map<number, number>();
const RATE_LIMIT_WINDOW = 1000; // 1 second
const MESSAGE_QUEUE = new Map<number, Array<() => Promise<void>>>();
const MAX_QUEUE_SIZE = 100;

// Format helpers
const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  });
};

// Enhanced bot configuration
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

// Add type declarations to fix TypeScript errors
declare module 'node-telegram-bot-api' {
  interface TelegramBot {
    handleUpdate(update: Update): Promise<void>;
  }
}

// Update error handling type
interface BotError extends Error {
  code?: number;
  response?: {
    statusCode: number;
    body: any;
  };
}


// Initialize bot with enhanced error handling and production mode settings
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
          allowed_updates: ["message", "callback_query", "chat_member"],
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

// Enhanced message queue processing
const processMessageQueue = async (chatId: number) => {
  const queue = MESSAGE_QUEUE.get(chatId) || [];
  if (queue.length === 0) return;

  try {
    const task = queue.shift();
    if (task) {
      await task();
    }
    if (queue.length > 0) {
      setTimeout(() => processMessageQueue(chatId), RATE_LIMIT_WINDOW);
    } else {
      MESSAGE_QUEUE.delete(chatId);
    }
  } catch (error) {
    console.error(`Error processing message queue for ${chatId}:`, error);
    // Remove failed task and continue with queue
    setTimeout(() => processMessageQueue(chatId), RATE_LIMIT_WINDOW);
  }
};

// Safe message sending with enhanced queue management
const safeSendMessage = async (chatId: number, text: string, options = {}) => {
  if (!bot) return;

  const sendTask = async () => {
    try {
      const now = Date.now();
      const lastMessageTime = messageRateLimiter.get(chatId) || 0;

      if (now - lastMessageTime < RATE_LIMIT_WINDOW) {
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_WINDOW));
      }

      messageRateLimiter.set(chatId, now);
      return await bot.sendMessage(chatId, text, { ...options, disable_web_page_preview: true });
    } catch (error: any) {
      console.error("Error sending message to", chatId, ":", error.message);
      if (error.code === 403) {
        // User has blocked or deleted the bot
        MESSAGE_QUEUE.delete(chatId);
        return;
      }
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

  const queue = MESSAGE_QUEUE.get(chatId) || [];
  if (queue.length >= MAX_QUEUE_SIZE) {
    console.warn(`Message queue full for chat ${chatId}, dropping message`);
    return;
  }

  queue.push(sendTask);
  MESSAGE_QUEUE.set(chatId, queue);

  if (queue.length === 1) {
    processMessageQueue(chatId);
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

  // Update the error handling in the existing handlers
  bot.on("polling_error", (error: BotError) => {
    console.error("⚠️ Polling Error:", {
      message: error.message,
      code: error.code,
      response: error.response,
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
  bot.on("error", (error: BotError) => {
    console.error("⚠️ Telegram Bot Error:", {
      message: error.message,
      code: error.code,
      response: error.response,
      stack: error.stack,
      time: new Date().toISOString()
    });
    handleReconnection();
  });

  // Enhanced group chat message handling
  bot.on("message", (msg) => {
    lastPingTime = Date.now();
    const chatType = msg.chat.type;
    const isGroupChat = chatType === 'group' || chatType === 'supergroup';

    debugLog("📨 Received message:", {
      chatId: msg.chat.id,
      text: msg.text,
      from: msg.from?.username,
      chatType,
      timestamp: new Date().toISOString()
    });

    // Handle group-specific behaviors
    if (isGroupChat && msg.text?.startsWith('/')) {
      const command = msg.text.split(' ')[0].split('@')[0];
      switch (command) {
        case '/stats':
        case '/verify':
          // These commands should be handled in private
          const privateLink = `https://t.me/GoatedVipsBot?start=${command.substring(1)}`;
          safeSendMessage(msg.chat.id,
            `🔒 For security reasons, please use this command in private chat:\n${privateLink}`);
          break;
        // Public commands that can be used in groups
        case '/leaderboard':
        case '/help':
        case '/play':
        case '/website':
          // These commands are already properly handled
          break;
      }
    }
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
          allowed_updates: ["message", "callback_query", "chat_member"],
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


// Setup command handlers
const setupCommandHandlers = () => {
  if (!bot) return;

  // Start command with enhanced verification guidance
  bot.onText(/\/start/, async (msg) => {
    debugLog("📝 Start command received from:", msg.chat.id);
    const welcomeMessage = `🎮 Welcome to Goated Vips Stats Tracking Bot!

To get started:
1️⃣ Use /verify followed by your Goated username
2️⃣ Wait for admin approval
3️⃣ Once verified, you can use /stats to check your statistics

Need help? Use /help for a list of commands.`;
    await safeSendMessage(msg.chat.id, welcomeMessage);
  });

  // Help command
  bot.onText(/\/help/, async (msg) => {
    debugLog("📝 Help command received from:", msg.chat.id);
    const helpText = `
🎮 GoatedVIPs Bot Commands:

📋 Basic Commands:
/verify <username> - Link your Goated account
/stats - View your statistics
/leaderboard - View top players
/play - Get game link
/website - Get website link

💡 Usage Tips:
• Use /verify in private chat for security
• Stats are updated in real-time
• Leaderboard shows top 10 players

🔒 Admin Commands:
/approve @username - Approve verification
/pending - View verification requests

Need to verify? Click here: https://t.me/GoatedVipsBot?start=verify
`.trim();
    await safeSendMessage(msg.chat.id, helpText);
  });

  // Enhanced verify command with better UX
  bot.onText(/\/verify(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    debugLog("📝 Verify command received from:", chatId);

    // If in group chat, direct to private
    if (msg.chat.type !== 'private') {
      const privateLink = `https://t.me/GoatedVipsBot?start=verify`;
      return safeSendMessage(chatId, `🔒 For security reasons, please verify in private chat:\n${privateLink}`);
    }

    const username = match?.[1]?.trim();
    if (!username) {
      const verifyInstructions = `
🔐 Verification Process:

1️⃣ Type: /verify YOUR_GOATED_USERNAME
   Example: /verify JohnDoe123

2️⃣ Wait for admin review
   • Admins will verify your account
   • You'll receive a confirmation message

3️⃣ After verification:
   • Use /stats to check your statistics
   • View /leaderboard rankings
   • Access exclusive features

❗️ Make sure to:
• Use your exact Goated username
• Be patient during verification
• Keep your account active

Ready? Type /verify followed by your username!
`.trim();
      return safeSendMessage(chatId, verifyInstructions);
    }

    try {
      const existingUser = await db
        .select()
        .from(telegramUsers)
        .where(eq(telegramUsers.telegramId, chatId.toString()))
        .limit(1);

      if (existingUser.length > 0 && existingUser[0].isVerified) {
        return safeSendMessage(chatId, "✅ Your account is already verified!");
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
      const [request] = await db.insert(verificationRequests).values({
        telegramId: chatId.toString(),
        userId: user.id,
        status: "pending",
        telegramUsername: msg.from?.username || null,
      }).returning();

      await safeSendMessage(chatId, "✅ Verification request submitted. An admin will review it shortly.");

      // Send admin notification with inline buttons
      const adminMessage = `🔍 New Verification Request #${request.id}
👤 Telegram: @${msg.from?.username || 'N/A'}
🎮 Goated: ${username}
💬 Chat ID: ${chatId}`;

      const inlineKeyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Approve", callback_data: `approve_${request.id}` },
              { text: "❌ Reject", callback_data: `reject_${request.id}` }
            ]
          ]
        }
      };

      await safeSendMessage(BOT_ADMIN_ID, adminMessage, inlineKeyboard);
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

  // Admin command to view pending verification requests
  bot.onText(/\/pending/, async (msg) => {
    const chatId = msg.chat.id;
    if (chatId !== BOT_ADMIN_ID) {
      return safeSendMessage(chatId, "❌ This command is only available to administrators.");
    }

    try {
      const pendingRequests = await db
        .select({
          id: verificationRequests.id,
          telegramUsername: verificationRequests.telegramUsername,
          userId: verificationRequests.userId,
          requestedAt: verificationRequests.requestedAt,
          username: users.username
        })
        .from(verificationRequests)
        .innerJoin(users, eq(users.id, verificationRequests.userId))
        .where(eq(verificationRequests.status, 'pending'));

      if (pendingRequests.length === 0) {
        return safeSendMessage(chatId, "✅ No pending verification requests.");
      }

      for (const request of pendingRequests) {
        const message = `🔍 Verification Request #${request.id}
👤 Telegram: @${request.telegramUsername || 'N/A'}
🎮 Goated: ${request.username}
⏰ Requested: ${new Date(request.requestedAt).toLocaleString()}`;

        const inlineKeyboard = {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ Approve", callback_data: `approve_${request.id}` },
                { text: "❌ Reject", callback_data: `reject_${request.id}` }
              ]
            ]
          }
        };

        await safeSendMessage(chatId, message, inlineKeyboard);
      }
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      await safeSendMessage(chatId, "❌ Error fetching pending requests.");
    }
  });

  // Enhanced stats command with admin override and improved formatting
  bot.onText(/\/stats(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    debugLog("📝 Stats command received from:", chatId);
    try {
      const targetUsername = match?.[1]?.trim();
      const isAdmin = chatId === BOT_ADMIN_ID;

      // If non-admin tries to check other user's stats
      if (targetUsername && !isAdmin) {
        return safeSendMessage(chatId, "❌ You can only check your own stats. Use /stats without parameters.");
      }

      if (!targetUsername) {
        // Regular user checking their own stats
        const [telegramUser] = await db
          .select()
          .from(telegramUsers)
          .where(eq(telegramUsers.telegramId, chatId.toString()))
          .limit(1);

        if (!telegramUser?.isVerified) {
          return safeSendMessage(chatId, "❌ Please verify your account first using /verify <your_username>");
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, telegramUser.userId))
          .limit(1);

        return await fetchAndSendStats(chatId, user.username);
      } else {
        // Admin checking another user's stats
        if (!isAdmin) {
          return safeSendMessage(chatId, "❌ You don't have permission to check other users' stats.");
        }
        return await fetchAndSendStats(chatId, targetUsername);
      }
    } catch (error) {
      console.error("Stats error:", error);
      await safeSendMessage(chatId, "❌ Error fetching stats. Please try again later.");
    }
  });

  // Helper function to fetch and send stats with improved formatting
  async function fetchAndSendStats(chatId: number, username: string) {
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
      (p: any) => p.name.toLowerCase() === username.toLowerCase()
    );

    if (!userStats) {
      return safeSendMessage(chatId, `❌ No stats found for user: ${username}`);
    }

    const position = transformedData.data.monthly.data.findIndex(
      (p: any) => p.name.toLowerCase() === username.toLowerCase()
    ) + 1;

    const statsMessage = `📊 Stats for ${username}:

💰 Daily Stats:
   Wagered Today: $${formatCurrency(userStats.wagered.today)}

📅 Weekly Stats:
   Wagered This Week: $${formatCurrency(userStats.wagered.this_week)}

📆 Monthly Stats:
   Wagered This Month: $${formatCurrency(userStats.wagered.this_month)}
   Monthly Race Position: #${position}

🏆 All-Time Stats:
   Total Wagered: $${formatCurrency(userStats.wagered.all_time)}`;

    await safeSendMessage(chatId, statsMessage);
  }

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
        default:
          // Handle Approve/Reject actions
          if (chatId !== BOT_ADMIN_ID || !callbackQuery.data) return;
          const [action, requestId] = callbackQuery.data.split('_');
          if (!['approve', 'reject'].includes(action)) return;

          const [request] = await db
            .select()
            .from(verificationRequests)
            .where(eq(verificationRequests.id, parseInt(requestId)))
            .limit(1);

          if (!request) {
            await bot.answerCallbackQuery(callbackQuery.id, {
              text: "Request not found",
              show_alert: true
            });
            return;
          }

          if (action === 'approve') {
            // Update verification request status
            await db
              .update(verificationRequests)
              .set({
                status: "approved",
                verifiedAt: new Date(),
                verifiedBy: chatId.toString()
              })
              .where(eq(verificationRequests.id, parseInt(requestId)));

            // Create or update telegram user record
            await db.insert(telegramUsers).values({
              telegramId: request.telegramId,
              telegramUsername: request.telegramUsername,
              userId: request.userId,
              isVerified: true,
              verifiedAt: new Date(),
              verifiedBy: chatId.toString()
            }).onConflictDoUpdate({
              target: [telegramUsers.telegramId],
              set: {
                telegramUsername: request.telegramUsername,
                userId: request.userId,
                isVerified: true,
                verifiedAt: new Date(),
                verifiedBy: chatId.toString()
              }
            });

            // Get user info for confirmation
            const [user] = await db
              .select()
              .from(users)
              .where(eq(users.id, request.userId))
              .limit(1);

            // Update message to show approved status
            await bot.editMessageText(
              `✅ Approved: @${request.telegramUsername} as ${user.username}`,
              {
                chat_id: chatId,
                message_id: callbackQuery.message?.message_id
              }
            );

            // Notify user
            await safeSendMessage(parseInt(request.telegramId),
              "✅ Your account has been verified! You can now use /stats to check your statistics.");

          } else {
            // Reject the request
            await db
              .update(verificationRequests)
              .set({
                status: "rejected",
                verifiedAt: new Date(),
                verifiedBy: chatId.toString()
              })
              .where(eq(verificationRequests.id, parseInt(requestId)));

            // Update message to show rejected status
            await bot.editMessageText(
              `❌ Rejected: @${request.telegramUsername}`,
              {
                chat_id: chatId,
                message_id: callbackQuery.message?.message_id
              }
            );

            // Notify user
            await safeSendMessage(parseInt(request.telegramId),
              "❌ Your verification request has been rejected. Please ensure you provided the correct Goated username and try again.");
          }
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