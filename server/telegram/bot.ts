import TelegramBot from "node-telegram-bot-api";
import { db } from "@db";
import { telegramUsers, verificationRequests } from "@db/schema/telegram";
import { users } from "@db/schema";
import { API_CONFIG } from "../config/api";
import { eq } from "drizzle-orm";
import fetch from "node-fetch";
import { transformLeaderboardData } from "../utils/leaderboard";

// Prevent multiple instances when deployed
if (process.env.NODE_ENV === "production" && process.env.BOT_ALREADY_RUNNING) {
  console.log("🚨 Bot is already running! Exiting...");
  process.exit(1);
}

process.env.BOT_ALREADY_RUNNING = "true";

// Extend TelegramBot type to include required properties
declare module 'node-telegram-bot-api' {
  interface TelegramBot {
    botInfo?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username: string;
      can_join_groups: boolean;
      can_read_all_group_messages: boolean;
      supports_inline_queries: boolean;
    };
  }
}

const DEBUG = process.env.NODE_ENV !== 'production';
const BOT_ADMIN_ID = process.env.TELEGRAM_ADMIN_ID ? parseInt(process.env.TELEGRAM_ADMIN_ID) : 1689953605;
const GROUP_MESSAGE_TYPES = ['group', 'supergroup'];

// Enhanced debug logging
const debugLog = (...args: any[]) => {
  const timestamp = new Date().toISOString();
  if (DEBUG) {
    console.log(`[Telegram Bot Debug ${timestamp}]`, ...args);
  } else if (args[0]?.includes('Error') || args[0]?.includes('❌')) {
    console.error(`[Telegram Bot Error ${timestamp}]`, ...args);
  }
};

// Improved rate limiting with priority queue
class PriorityMessageQueue {
  private queue: Map<number, QueueItem[]> = new Map();
  private processing: Map<number, boolean> = new Map();
  private readonly RATE_LIMITS: Record<Priority, number> = {
    high: 500,    // 2 messages per second
    medium: 1000, // 1 message per second
    low: 2000,    // 1 message per 2 seconds
  };

  async add(chatId: number, task: () => Promise<void>, priority: Priority = 'medium') {
    const items = this.queue.get(chatId) || [];
    items.push({ priority, task, timestamp: Date.now() });
    items.sort((a, b) =>
      (this.RATE_LIMITS[b.priority] - this.RATE_LIMITS[a.priority]) ||
      (a.timestamp - b.timestamp)
    );

    this.queue.set(chatId, items);
    if (!this.processing.get(chatId)) {
      await this.process(chatId);
    }
  }

  private async process(chatId: number) {
    if (!this.queue.has(chatId)) return;

    this.processing.set(chatId, true);
    const items = this.queue.get(chatId)!;

    while (items.length > 0) {
      const item = items[0];
      try {
        await item.task();
        await new Promise(resolve =>
          setTimeout(resolve, this.RATE_LIMITS[item.priority])
        );
      } catch (error) {
        debugLog(`Error processing queue item for ${chatId}:`, error);
      }
      items.shift();
    }

    this.processing.set(chatId, false);
    this.queue.delete(chatId);
  }
}

type Priority = 'high' | 'medium' | 'low';
interface QueueItem {
  priority: Priority;
  task: () => Promise<void>;
  timestamp: number;
}

// Enhanced rate limiting and throttling
class RateLimiter {
  private limits: Map<number, number> = new Map();
  private readonly WINDOW = 60000; // 1 minute window
  private readonly MAX_MESSAGES = 30; // Max messages per window

  async checkLimit(chatId: number): Promise<boolean> {
    const now = Date.now();
    const userCount = this.limits.get(chatId) || 0;
    
    if (userCount >= this.MAX_MESSAGES) {
      return false;
    }
    
    this.limits.set(chatId, userCount + 1);
    setTimeout(() => this.limits.set(chatId, (this.limits.get(chatId) || 1) - 1), this.WINDOW);
    
    return true;
  }
}

const messageQueue = new PriorityMessageQueue();
const rateLimiter = new RateLimiter();

// Bot instance and configuration
let bot: TelegramBot | null = null;
let isReconnecting = false;
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectAttempts = 0;

// Health monitoring
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const HEALTH_CHECK_TIMEOUT = 10000;  // 10 seconds
let healthCheckFailures = 0;
const MAX_HEALTH_CHECK_FAILURES = 3;

// Initialize bot instance
const initializeBot = async () => {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error("❌ TELEGRAM_BOT_TOKEN is not set!");
    return null;
  }

  try {
    // If bot instance exists, clean it up properly
    if (bot) {
      try {
        await bot.deleteWebHook();
        await bot.stopPolling();
        bot = null;
        // Wait for cleanup
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error("Error cleaning up previous bot instance:", error);
      }
    }

    debugLog("Initializing bot...");
    const WEBHOOK_DOMAIN = process.env.WEBHOOK_URL || 'https://goatedvips.gg';

    // Always use webhook mode in production
    if (process.env.NODE_ENV === "development") {
      console.log("🔄 Running bot in POLLING mode...");
      try {
        bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
          polling: false
        });
        
        // Ensure webhook is cleared
        await bot.deleteWebHook();
        // Wait for webhook cleanup
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await bot.startPolling({
          interval: 300,
          autoStart: true,
          params: {
            timeout: 10,
            allowed_updates: ["message", "callback_query", "chat_member", "my_chat_member"],
          }
        });
      } catch (error) {
        console.error("Failed to start polling:", error);
        return null;
      }
    } else {
      console.log(`🌍 Running bot in WEBHOOK mode at ${WEBHOOK_DOMAIN}`);
      const webhookPath = '/telegram-webhook';

      bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
        webHook: {
          port: 5001,
          host: '0.0.0.0'
        }
      });

      // Clear any existing webhook and set new one
      await bot.deleteWebHook();
      await bot.setWebHook(`${WEBHOOK_DOMAIN}${webhookPath}`, {
        allowed_updates: ["message", "callback_query", "chat_member", "my_chat_member"]
      });

      const webhookInfo = await bot.getWebHookInfo();
      console.log("Webhook Info:", webhookInfo);
    }

    // Get bot info
    const botInfo = await bot.getMe();
    bot.botInfo = botInfo;
    debugLog("Bot info retrieved:", botInfo);

    setupBotEventHandlers();
    setupCommandHandlers();
    startHealthCheck();

    // Set up bot commands menu
    await bot.setMyCommands([
      { command: 'start', description: 'Get started with the bot' },
      { command: 'verify', description: 'Link your Goated account' },
      { command: 'stats', description: 'View your wager statistics' },
      { command: 'check_stats', description: 'Check stats for username' },
      { command: 'race', description: 'Check your race position' },
      { command: 'leaderboard', description: 'See top players' },
      { command: 'play', description: 'Play on Goated with our link' },
      { command: 'website', description: 'Visit GoatedVIPs.gg' },
      { command: 'adminpanel', description: 'Access the admin panel' }, // Added adminpanel command
      { command: 'broadcast', description: 'Broadcast a message (admin only)' }, // Added broadcast command
      { command: 'message', description: 'Send a direct message (admin only)' } // Added message command
    ]);

    debugLog("Bot initialized successfully");
    return bot;
  } catch (error) {
    console.error("❌ Bot initialization failed:", error);
    return null;
  }
};

// Bot event handlers setup
const setupBotEventHandlers = () => {
  if (!bot) return;

  bot.on('message', handleMessage);
  bot.on('callback_query', handleCallbackQuery);
  bot.on("my_chat_member", async (chatMember) => {
    const chat = chatMember.chat;
    const newStatus = chatMember.new_chat_member.status;

    debugLog("Chat member status update:", {
      chatId: chat.id,
      type: chat.type,
      newStatus
    });

    if (GROUP_MESSAGE_TYPES.includes(chat.type)) {
      if (newStatus === 'administrator') {
        await safeSendMessage(
          chat.id,
          `✅ Thank you for making me an admin! I'm now fully operational.`,
          {},
          'high'
        );
      } else if (newStatus === 'member') {
        await safeSendMessage(
          chat.id,
          `⚠️ Please note: I need admin rights to function properly.`,
          {},
          'high'
        );
      }
    }
  });

  // Enhanced error handling
  bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
    healthCheckFailures++;
    if (healthCheckFailures >= MAX_HEALTH_CHECK_FAILURES) {
      handleReconnection();
    }
  });

  bot.on('error', (error) => {
    console.error('Bot error:', error);
    healthCheckFailures++;
    if (healthCheckFailures >= MAX_HEALTH_CHECK_FAILURES) {
      handleReconnection();
    }
  });
};

// Message handler
const handleMessage = async (msg: TelegramBot.Message) => {
  if (!bot) return;

  try {
    const chatId = msg.chat.id;
    const isGroupChat = GROUP_MESSAGE_TYPES.includes(msg.chat.type);

    debugLog(`Message received from ${msg.from?.username || 'Unknown'} in ${msg.chat.type}`);

    // Handle commands
    if (msg.text?.startsWith('/')) {
      const command = msg.text.split(' ')[0].split('@')[0];
      const args = msg.text.split(' ').slice(1);

      // Check if command should be in private
      if (isGroupChat && ['verify', 'stats', 'profile', 'check_stats'].includes(command.substring(1))) {
        const privateLink = `https://t.me/${bot.botInfo?.username}?start=${command.substring(1)}`;
        await safeSendMessage(chatId,
          `🔒 For security, please use this command in private:\n${privateLink}`,
          {},
          'high'
        );
        return;
      }

      await handleCommand(command, msg, args);
      return;
    }

    // Handle group-specific behaviors
    if (isGroupChat) {
      if (msg.new_chat_members?.some(member => member.id === bot.botInfo?.id)) {
        await safeSendMessage(
          chatId,
          `👋 Thanks for adding me! Please make me an admin to ensure proper functionality.\n\nUse /help to see available commands.`,
          {},
          'high'
        );
      }
    }
  } catch (error) {
    console.error('Error handling message:', error);
  }
};

// Setup command handlers
const setupCommandHandlers = () => {
  if (!bot) return;

  bot.onText(/\/(start|help|verify|stats|leaderboard|race|play|website|check_stats|adminpanel|broadcast|message)(?:@[\w]+)? (.+)/, async (msg, match) => {
    if (!match) return;
    const command = match[1];
    const args = match[2].split(" ");
    handleCommand(command, msg, args);
  });

  bot.onText(/\/(start|help|verify|stats|leaderboard|race|play|website|check_stats|adminpanel|broadcast|message)(?:@[\w]+)?/, async (msg, match) => {
    if (!match) return;
    const command = match[1];
    handleCommand(command, msg, []);
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

        await safeSendMessage(chatId, message, inlineKeyboard, 'high');
      }
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      await safeSendMessage(chatId, "❌ Error fetching pending requests.");
    }
  });

  // NOTE: The duplicate callback_query listener below has been merged into a single, unified handler.
  // (Any previous extra registration of callback_query has been removed for clarity.)
};

// Unified callback query handler with additional inline button cases
const handleCallbackQuery = async (query: TelegramBot.CallbackQuery): Promise<void> => {
  if (!bot || !query.message) return;
  const chatId = query.message.chat.id;

  try {
    // Handle refresh stats inline button with data like "stats_username"
    if (query.data && query.data.startsWith("stats_")) {
      const refreshUsername = query.data.split("_")[1];
      await bot.emit('message', {
        ...query.message,
        text: `/stats ${refreshUsername}`,
        entities: [{ offset: 0, length: 6 + refreshUsername.length + 1, type: 'bot_command' }]
      });
      await bot.answerCallbackQuery(query.id);
      return;
    }

    switch (query.data) {
      case 'my_stats':
        await bot.emit('message', {
          ...query.message,
          text: '/stats',
          entities: [{ offset: 0, length: 6, type: 'bot_command' }]
        });
        break;
      case 'refresh_leaderboard':
        await bot.emit('message', {
          ...query.message,
          text: '/leaderboard',
          entities: [{ offset: 0, length: 11, type: 'bot_command' }]
        });
        break;
      case 'verify':
        await bot.emit('message', {
          ...query.message,
          text: '/verify',
          entities: [{ offset: 0, length: 7, type: 'bot_command' }]
        });
        break;
      case 'stats':
        await bot.emit('message', {
          ...query.message,
          text: '/stats',
          entities: [{ offset: 0, length: 6, type: 'bot_command' }]
        });
        break;
      case 'leaderboard':
        await bot.emit('message', {
          ...query.message,
          text: '/leaderboard',
          entities: [{ offset: 0, length: 11, type: 'bot_command' }]
        });
        break;
      case 'help':
        await bot.emit('message', {
          ...query.message,
          text: '/help',
          entities: [{ offset: 0, length: 5, type: 'bot_command' }]
        });
        break;
      case 'play':
        await bot.emit('message', {
          ...query.message,
          text: '/play',
          entities: [{ offset: 0, length: 5, type: 'bot_command' }]
        });
        break;
      case 'admin_broadcast':
        await bot.emit('message', {
          ...query.message,
          text: '/broadcast',
          entities: [{ offset: 0, length: 10, type: 'bot_command' }]
        });
        break;
      case 'admin_message':
        await bot.emit('message', {
          ...query.message,
          text: '/message',
          entities: [{ offset: 0, length: 8, type: 'bot_command' }]
        });
        break;
      case 'admin_pending':
        await bot.emit('message', {
          ...query.message,
          text: '/pending',
          entities: [{ offset: 0, length: 8, type: 'bot_command' }]
        });
        break;
      default:
        // Handle Approve/Reject actions for inline buttons (e.g. "approve_123" or "reject_123")
        if (chatId !== BOT_ADMIN_ID || !query.data) return;
        const [action, requestId] = query.data.split('_');
        if (!['approve', 'reject'].includes(action)) return;
        await handleVerificationAction(action as 'approve' | 'reject', parseInt(requestId), chatId);
        break;
    }
    await bot.answerCallbackQuery(query.id);
  } catch (error) {
    debugLog('Error handling callback query:', error);
    await bot.answerCallbackQuery(query.id, {
      text: '❌ Error processing request',
      show_alert: true
    });
  }
};

// Handle bot reconnection
const handleReconnection = async () => {
  if (!bot || isReconnecting || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;

  isReconnecting = true;
  reconnectAttempts++;

  console.log(`🔄 Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);

  try {
    await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY));
    const botInfo = await bot.getMe();
    bot.botInfo = botInfo;

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
      safeSendMessage(BOT_ADMIN_ID, "⚠️ Bot reconnection failed after maximum attempts. Please check the logs.");
    }
  }
};

// Enhanced health check with error recovery
const startHealthCheck = () => {
  if (!bot) return;
  
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 5;
  const RECOVERY_DELAY = 5000;

  setInterval(async () => {
    try {
      const webhookInfo = await bot.getWebHookInfo();
      if (webhookInfo.url) {
        healthCheckFailures = 0;
        debugLog("Webhook health check passed");
      } else {
        throw new Error("Webhook not set");
      }
    } catch (error) {
      console.error("Webhook health check error:", error);
      healthCheckFailures++;
      debugLog(`Health check failed (${healthCheckFailures}/${MAX_HEALTH_CHECK_FAILURES})`);
      if (healthCheckFailures >= MAX_HEALTH_CHECK_FAILURES) {
        debugLog("Maximum health check failures reached - Attempting webhook reset");
        await initializeBot();
      }
    }
  }, HEALTH_CHECK_INTERVAL);
};

// Command handler function
const handleCommand = async (command: string, msg: TelegramBot.Message, args: string[]) => {
  if (!bot) return;
  
  const chatId = msg.chat.id;
  if (!await rateLimiter.checkLimit(chatId)) {
    return safeSendMessage(chatId, "⚠️ Rate limit exceeded. Please wait a moment before trying again.");
  }

  const isGroupChat = GROUP_MESSAGE_TYPES.includes(msg.chat.type);

  try {
    switch (command) {
      case '/broadcast':
        if (chatId !== BOT_ADMIN_ID) {
          return safeSendMessage(chatId, "❌ This command is only available to administrators.");
        }
        await safeSendMessage(chatId, "📢 Enter the message you want to broadcast:");
        bot.once("message", async (response) => {
          const BATCH_SIZE = 30;
          const BATCH_DELAY = 1000; // 1 second between batches
          if (!response.text) return;

          const [users] = await db
            .select()
            .from(telegramUsers);

          let successCount = 0;
          let failureCount = 0;

          for (const user of users) {
            try {
              await safeSendMessage(parseInt(user.telegramId), 
                `📢 Announcement:\n\n${response.text}`, {}, 'high');
              successCount++;
            } catch (error) {
              console.error(`Failed to send to ${user.telegramId}:`, error);
              failureCount++;
            }
          }

          await safeSendMessage(chatId, 
            `✅ Broadcast complete!\n📤 Delivered: ${successCount}\n❌ Failed: ${failureCount}`);
        });
        break;

      case '/message':
        if (chatId !== BOT_ADMIN_ID) {
          return safeSendMessage(chatId, "❌ This command is only available to administrators.");
        }

        const username = args[0]?.replace('@', '');
        const message = args.slice(1).join(' ');

        if (!username || !message) {
          return safeSendMessage(chatId, 
            "❌ Usage: /message @username or goatedUsername message");
        }

        const [targetUser] = await db
          .select()
          .from(telegramUsers)
          .where(
            eq(telegramUsers.telegramUsername, username)
          )
          .limit(1);

        if (!targetUser) {
          return safeSendMessage(chatId, "❌ User not found or not verified.");
        }

        try {
          await safeSendMessage(parseInt(targetUser.telegramId), 
            `✉️ Message from Admin:\n\n${message}`, {}, 'high');
          await safeSendMessage(chatId, `✅ Message sent to @${username} successfully!`);
        } catch (error) {
          console.error(`Failed to message ${username}:`, error);
          await safeSendMessage(chatId, 
            `❌ Failed to send message to @${username}. They may have blocked the bot.`);
        }
        break;

      case '/adminpanel':
        if (chatId !== BOT_ADMIN_ID) {
          return safeSendMessage(chatId, "❌ This command is only available to administrators.");
        }

        await safeSendMessage(chatId, "👑 Admin Panel:", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "📢 Broadcast Message", callback_data: "admin_broadcast" }],
              [{ text: "✉️ Direct Message User", callback_data: "admin_message" }],
              [{ text: "👥 Pending Verifications", callback_data: "admin_pending" }]
            ]
          }
        });
        break;
      case '/start': {
        const welcomeMessage = `🐐 Welcome to Goated Stats Bot!

Admin Commands:
• /broadcast - Send message to all users
• /group_message - Send message to group
• /user_info - Get user information
• /pending - View verification requests
• /verify - Verify a user
• /reject - Reject a verification

Available Commands:
• /start - Get started with the bot
• /verify - Link your Goated account
• /stats - View your wager statistics
• /check_stats - Check stats for username
• /race - Check your race position
• /leaderboard - See top players
• /play - Play on Goated with our link
• /website - Visit GoatedVIPs.gg
• /adminpanel - Access the admin panel (admin only)
• /broadcast - Broadcast a message (admin only)
• /message - Send a direct message (admin only)

Need help? Contact @xGoombas for support.`;

        const startInlineKeyboard = {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "🔐 Verify Account", callback_data: "verify" },
                { text: "📊 My Stats", callback_data: "stats" }
              ],
              [
                { text: "🏆 Leaderboard", callback_data: "leaderboard" },
                { text: "🎮 Play", callback_data: "play" }
              ],
              [
                { text: "🌐 Website", url: "https://GoatedVIPs.gg" },
                { text: "👤 Contact Support", url: "https://t.me/xGoombas" }
              ]
            ]
          }
        };

        await safeSendMessage(chatId, welcomeMessage, startInlineKeyboard);
        break;
      }
      case '/help': {
        // Check if user is verified
        const [telegramUser] = await db
          .select()
          .from(telegramUsers)
          .where(eq(telegramUsers.telegramId, chatId.toString()))
          .limit(1);

        const helpText = telegramUser?.isVerified ? 
          `📋 Available Commands:
• /stats - View your wager statistics
• /check_stats - Check stats for username
• /race - Check your race position
• /leaderboard - See top players
• /play - Play on Goated
• /website - Visit our website

Need help? Contact @xGoombas for support.`.trim() :
          `🔐 Verification Required

To access all features, please verify your Goated account:

1️⃣ Click the button below to start verification
2️⃣ Enter your Goated username
3️⃣ Wait for admin approval (usually within minutes)

Available Commands:
• /verify <username> - Link your account
• /help - Show all commands

Need assistance? Contact @xGoombas`.trim();

        // For verified users, add an inline keyboard for quick navigation
        const helpInlineKeyboard = telegramUser?.isVerified ? {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "📊 My Stats", callback_data: "stats" },
                { text: "🏆 Leaderboard", callback_data: "leaderboard" }
              ],
              [
                { text: "🌐 Website", url: "https://GoatedVIPs.gg" },
                { text: "👤 Contact Support", url: "https://t.me/xGoombas" }
              ]
            ]
          }
        } : {};

        await safeSendMessage(chatId, helpText, helpInlineKeyboard);
        break;
      }
      case '/verify':
        await handleVerifyCommand(msg, args);
        break;
      case '/stats':
      case '/check_stats':
        await handleStatsCommand(msg, args);
        break;
      case '/leaderboard':
        await handleLeaderboardCommand(msg);
        break;
      case '/play':
        // Refactored play command with affiliate link
        await safeSendMessage(chatId, "🎮 Enjoy playing on Goated! Get started: <a href='https://www.Goated.com/r/GOATEDVIPS'>here</a>");
        break;
      // Add other command handlers as needed
      default:
        // Only handle specific redirects, ignore other unknown commands
        if (isGroupChat && ['verify', 'stats', 'profile', 'check_stats'].includes(command)) {
          const privateLink = `https://t.me/${bot.botInfo?.username}?start=${command}`;
          await safeSendMessage(
            chatId,
            `🔒 For security, please use this command in private:\n${privateLink}`,
            {},
            'high'
          );
        }
        break;
    }
  } catch (error) {
    debugLog(`Error handling command ${command}:`, error);
    await safeSendMessage(chatId, "❌ Error processing command. Please try again later.");
  }
};

// Callback query handler for inline button actions is defined above

// Helper function to handle verification actions
const handleVerificationAction = async (
  action: 'approve' | 'reject',
  requestId: number,
  adminChatId: number
): Promise<void> => {
  if (!bot) return;

  try {
    const [request] = await db
      .select()
      .from(verificationRequests)
      .where(eq(verificationRequests.id, requestId))
      .limit(1);

    if (!request) {
      throw new Error("Request not found");
    }

    if (action === 'approve') {
      await db
        .update(verificationRequests)
        .set({
          status: "approved",
          verifiedAt: new Date(),
          verifiedBy: adminChatId.toString()
        })
        .where(eq(verificationRequests.id, requestId));

      await db.insert(telegramUsers).values({
        telegramId: request.telegramId,
        telegramUsername: request.telegramUsername || '',
        userId: request.userId,
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: adminChatId.toString()
      }).onConflictDoUpdate({
        target: [telegramUsers.telegramId],
        set: {
          telegramUsername: request.telegramUsername || '',
          userId: request.userId,
          isVerified: true,
          verifiedAt: new Date(),
          verifiedBy: adminChatId.toString()
        }
      });

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, request.userId))
        .limit(1);

      if (!user) {
        throw new Error("User not found");
      }

      await safeSendMessage(parseInt(request.telegramId),
        "✅ Your account has been verified! You can now use /stats to check your statistics.",
        {},
        'high'
      );
    } else {
      await db
        .update(verificationRequests)
        .set({
          status: "rejected",
          verifiedAt: new Date(),
          verifiedBy: adminChatId.toString()
        })
        .where(eq(verificationRequests.id, requestId));

      await safeSendMessage(parseInt(request.telegramId),
        "❌ Your verification request has been rejected. Please ensure you provided the correct Goated username and try again.",
        {},
        'high'
      );
    }
  } catch (error) {
    console.error('Error handling verification action:', error);
    throw error;
  }
};

// Handle verify command
const handleVerifyCommand = async (msg: TelegramBot.Message, args: string[]) => {
  const chatId = msg.chat.id;
  debugLog("📝 Verify command received from:", chatId);

  // If in group chat, direct to private
  if (msg.chat.type !== 'private') {
    const privateLink = `https://t.me/${bot!.botInfo?.username}?start=verify`;
    return safeSendMessage(chatId, `🔒 For security reasons, please verify in private chat:\n${privateLink}`, {}, 'high');
  }

  const username = args[0]?.trim();
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

    await safeSendMessage(BOT_ADMIN_ID, adminMessage, inlineKeyboard, 'high');
  } catch (error) {
    console.error("Verification error:", error);
    await safeSendMessage(chatId, "❌ Error processing verification. Please try again later.");
  }
};

// Handle stats command
const handleStatsCommand = async (msg: TelegramBot.Message, args: string[]) => {
  const chatId = msg.chat.id;
  debugLog("📝 Stats command received from:", chatId);
  try {
    const targetUsername = args[0]?.trim();
    const isAdmin = chatId === BOT_ADMIN_ID;

    // If non-admin tries to check other user's stats
    if (targetUsername && !isAdmin) {
      return safeSendMessage(chatId, "❌ You can only check your own stats. Use /stats without parameters.", {}, 'medium', true);
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
};

// Handle leaderboard command
const handleLeaderboardCommand = async (msg: TelegramBot.Message) => {
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
};

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  });
};

// Helper function to fetch and send stats (now with a refresh inline button)
async function fetchAndSendStats(chatId: number, username: string) {
  try {
    const response = await fetch(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.stats}/${username}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.API_TOKEN || API_CONFIG.token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.status}`);
    }

    const data = await response.json();
    const message = formatStatsMessage(data, username);
    const inlineKeyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔄 Refresh Stats", callback_data: `stats_${username}` }]
        ]
      }
    };
    await safeSendMessage(chatId, message, inlineKeyboard);
  } catch (error) {
    console.error("Error fetching stats:", error);
    await safeSendMessage(chatId, "❌ Error fetching stats. Please try again later.");
  }
}

// Helper function to format stats message
function formatStatsMessage(data: any, username: string): string {
  return `📊 Stats for ${username}:

💰 Daily Stats:
   Wagered Today: $${formatCurrency(data.daily.wagered)}

📅 Weekly Stats:
   Wagered This Week: $${formatCurrency(data.weekly.wagered)}

📆 Monthly Stats:
   Wagered This Month: $${formatCurrency(data.monthly.wagered)}
   Monthly Race Position: #${data.monthly.position}

🏆 All-Time Stats:
   Total Wagered: $${formatCurrency(data.allTime.wagered)}`;
}

// Enhanced message sending with queue
const safeSendMessage = async (
  chatId: number,
  text: string,
  options: TelegramBot.SendMessageOptions = {},
  priority: Priority = 'medium',
  autoDelete: boolean = false
): Promise<void> => {
  if (!bot) return;

  const sendTask = async (): Promise<void> => {
    try {
      const msg = await bot!.sendMessage(chatId, text, {
        ...options,
        disable_web_page_preview: true,
        parse_mode: 'HTML'
      });
      
      // Auto-delete non-important group messages after 5 minutes
      if (autoDelete && GROUP_MESSAGE_TYPES.includes(msg.chat.type)) {
        setTimeout(async () => {
          try {
            await bot!.deleteMessage(chatId, msg.message_id.toString());
          } catch (error) {
            debugLog('Error deleting message:', error);
          }
        }, 5 * 60 * 1000); // 5 minutes
      }
    } catch (error: any) {
      if (error.code === 403) {
        debugLog(`Bot blocked by user ${chatId}`);
        return;
      }

      // Retry with simplified message if HTML parsing fails
      try {
        await bot!.sendMessage(chatId, text.replace(/[<>]/g, ""), {
          ...options,
          parse_mode: undefined,
          disable_web_page_preview: true,
        });
      } catch (retryError: any) {
        debugLog(`Failed to send message to ${chatId}:`, retryError);
      }
    }
  };

  await messageQueue.add(chatId, sendTask, priority);
};

// Export necessary functions and bot instance
export {
  bot,
  initializeBot,
  safeSendMessage,
  handleMessage,
  handleCommand,
  handleCallbackQuery,
  handleVerifyCommand,
  handleStatsCommand,
  handleLeaderboardCommand,
  handleVerificationAction
};