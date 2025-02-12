import TelegramBot from "node-telegram-bot-api";
import { db } from "@db";
import { telegramUsers, verificationRequests } from "@db/schema/telegram";
import { users } from "@db/schema";
import { API_CONFIG } from "../config/api";
import { eq } from "drizzle-orm";
import fetch from "node-fetch";
import { transformLeaderboardData } from "../utils/leaderboard";

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
      can_connect_to_business: boolean;
      has_main_web_app: boolean;
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
type Priority = 'high' | 'medium' | 'low';
interface QueueItem {
  priority: Priority;
  task: () => Promise<void>;
  timestamp: number;
}

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

const messageQueue = new PriorityMessageQueue();

// Enhanced message sending with priority queue
const safeSendMessage = async (
  chatId: number,
  text: string,
  options: TelegramBot.SendMessageOptions = {},
  priority: Priority = 'medium'
): Promise<void> => {
  if (!bot) return;

  const sendTask = async (): Promise<void> => {
    try {
      await bot!.sendMessage(chatId, text, {
        ...options,
        disable_web_page_preview: true,
        parse_mode: 'HTML'
      });
    } catch (error: any) {
      if (error.code === 403) {
        debugLog(`Bot blocked by user ${chatId}`);
        return;
      }

      // Retry with simplified message
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

// Bot instance and configuration
let bot: TelegramBot | null = null;
let isReconnecting = false;
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectAttempts = 0;

// Health monitoring
const HEALTH_CHECK_INTERVAL = 30000;
const HEALTH_CHECK_TIMEOUT = 10000;
let healthCheckFailures = 0;
const MAX_HEALTH_CHECK_FAILURES = 3;

// Initialize bot instance
const initializeBot = async () => {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error("❌ TELEGRAM_BOT_TOKEN is not set!");
    return null;
  }

  if (bot) {
    debugLog("Bot instance already exists, returning existing instance");
    return bot;
  }

  try {
    debugLog("Initializing bot...");

    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
      polling: false, // Disable polling when using webhooks
      filepath: false,
    });

    // Get bot info for later use
    const botInfo = await bot.getMe();
    bot.botInfo = botInfo;
    debugLog("Bot info retrieved:", botInfo);

    setupBotEventHandlers();
    setupCommandHandlers();
    startHealthCheck();

    debugLog("Bot initialized successfully");
    return bot;
  } catch (error) {
    console.error("❌ Bot initialization failed:", error);
    return null;
  }
};

// Message handler function
const handleMessage = async (msg: TelegramBot.Message): Promise<void> => {
  if (!bot) return;

  const chatType = msg.chat.type;
  const isGroupChat = GROUP_MESSAGE_TYPES.includes(chatType);

  debugLog("Message received:", {
    chatId: msg.chat.id,
    type: chatType,
    from: msg.from?.username,
    text: msg.text?.substring(0, 100)
  });

  if (msg.text?.startsWith('/')) {
    const command = msg.text.split(' ')[0].split('@')[0];
    if (isGroupChat) {
      // Check if command requires private chat
      if (['verify', 'stats', 'profile'].includes(command.substring(1))) {
        const privateLink = `https://t.me/${bot.botInfo?.username}?start=${command.substring(1)}`;
        await safeSendMessage(
          msg.chat.id,
          `🔒 For security, please use this command in private:\n${privateLink}`,
          {},
          'high'
        );
        return;
      }
    }
    // Handled by handleCommand now
    return;
  }

  if (isGroupChat) {
    // Handle group-specific behaviors
    if (msg.new_chat_members?.some(member => member.id === bot.botInfo?.id)) {
      await safeSendMessage(
        msg.chat.id,
        `👋 Thanks for adding me! Use /help to see available commands.`,
        {},
        'high'
      );
    }
  }
};

// Callback query handler function
const handleCallbackQuery = async (query: TelegramBot.CallbackQuery): Promise<void> => {
  if (!bot || !query.message) return;

  const chatId = query.message.chat.id;

  try {
    switch (query.data) {
      case 'my_stats':
        // Simulate /stats command
        await handleMessage({
          ...query.message,
          text: '/stats',
          entities: [{ offset: 0, length: 6, type: 'bot_command' }]
        });
        break;

      case 'refresh_leaderboard':
        // Simulate /leaderboard command
        await handleMessage({
          ...query.message,
          text: '/leaderboard',
          entities: [{ offset: 0, length: 11, type: 'bot_command' }]
        });
        break;

      default:
        // Handle verification approvals/rejections
        if (chatId !== BOT_ADMIN_ID || !query.data) return;
        const [action, requestId] = query.data.split('_');

        if (!['approve', 'reject'].includes(action)) return;

        await handleVerificationAction(action, parseInt(requestId), chatId);
    }

    // Answer callback query to remove loading state
    await bot.answerCallbackQuery(query.id);
  } catch (error) {
    debugLog('Error handling callback query:', error);
    await bot.answerCallbackQuery(query.id, {
      text: '❌ Error processing request',
      show_alert: true
    });
  }
};

// Update handler for webhook
const handleUpdate = async (update: TelegramBot.Update): Promise<void> => {
  try {
    debugLog('Processing update:', JSON.stringify(update, null, 2).substring(0, 500));

    if (!bot) {
      throw new Error('Bot instance not initialized');
    }

    if (!bot.botInfo) {
      debugLog('Getting bot info...');
      bot.botInfo = await bot.getMe();
    }

    if (update.message) {
      const msg = update.message;
      if (msg.text?.startsWith('/')) {
        // Process command directly instead of using emit
        debugLog('Command received:', msg.text);
        const command = msg.text.split(' ')[0].substring(1); // Remove the '/'
        const args = msg.text.split(' ').slice(1);

        // Handle commands based on the command type
        switch (command) {
          case 'start':
          case 'help':
          case 'verify':
          case 'stats':
          case 'leaderboard':
            await handleCommand(command, msg, args);
            break;
          default:
            await safeSendMessage(msg.chat.id, "Unknown command. Use /help to see available commands.");
        }
        return;
      }
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }
  } catch (error: any) {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      code: error.code,
      timestamp: new Date().toISOString()
    };
    debugLog('Error handling update:', errorDetails);
    throw error;
  }
};

// Command handler function
const handleCommand = async (command: string, msg: TelegramBot.Message, args: string[]) => {
  if (!bot) return;

  const chatId = msg.chat.id;
  const isGroupChat = GROUP_MESSAGE_TYPES.includes(msg.chat.type);

  try {
    switch (command) {
      case 'start':
        const welcomeMessage = `🎮 Welcome to Goated Vips Stats Tracking Bot!
To get started:
1️⃣ Use /verify followed by your Goated username
2️⃣ Wait for admin approval
3️⃣ Once verified, you can use /stats to check your statistics

Need help? Use /help for a list of commands.`;
        await safeSendMessage(chatId, welcomeMessage);
        break;

      case 'help':
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

Need to verify? Click here: https://t.me/${bot.botInfo?.username}?start=verify
`.trim();
        await safeSendMessage(chatId, helpText);
        break;
      case 'verify':
        await handleVerifyCommand(msg, args);
        break;
      case 'stats':
        await handleStatsCommand(msg, args);
        break;
      case 'leaderboard':
        await handleLeaderboardCommand(msg);
        break;
      // Add other command handlers as needed
      default:
        if (isGroupChat && ['verify', 'stats', 'profile'].includes(command)) {
          const privateLink = `https://t.me/${bot.botInfo?.username}?start=${command}`;
          await safeSendMessage(
            chatId,
            `🔒 For security, please use this command in private:\n${privateLink}`,
            {},
            'high'
          );
        } else {
          await safeSendMessage(chatId, `Unknown command: ${command}. Use /help for a list of commands.`);
        }
        break;
    }
  } catch (error) {
    debugLog(`Error handling command ${command}:`, error);
    await safeSendMessage(chatId, "❌ Error processing command. Please try again later.");
  }
};


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

const handleStatsCommand = async (msg: TelegramBot.Message, args: string[]) => {
  const chatId = msg.chat.id;
  debugLog("📝 Stats command received from:", chatId);
  try {
    const targetUsername = args[0]?.trim();
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
};

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
};



// Helper function to handle verification actions
const handleVerificationAction = async (
  action: 'approve' | 'reject',
  requestId: number,
  adminChatId: number
): Promise<void> => {
  if (!bot) return;

  const [request] = await db
    .select()
    .from(verificationRequests)
    .where(eq(verificationRequests.id, requestId))
    .limit(1);

  if (!request) {
    throw new Error("Request not found");
  }

  if (action === 'approve') {
    // Update verification request status
    await db
      .update(verificationRequests)
      .set({
        status: "approved",
        verifiedAt: new Date(),
        verifiedBy: adminChatId.toString()
      })
      .where(eq(verificationRequests.id, requestId));

    // Create or update telegram user record
    await db.insert(telegramUsers).values({
      telegramId: request.telegramId,
      telegramUsername: request.telegramUsername,
      userId: request.userId,
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: adminChatId.toString()
    }).onConflictDoUpdate({
      target: [telegramUsers.telegramId],
      set: {
        telegramUsername: request.telegramUsername,
        userId: request.userId,
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: adminChatId.toString()
      }
    });

    // Get user info for confirmation
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1);

    if (!user) {
      throw new Error("User not found");
    }

    // Notify user and admin
    await safeSendMessage(parseInt(request.telegramId),
      "✅ Your account has been verified! You can now use /stats to check your statistics.",
      {},
      'high'
    );

    return;
  }

  // Handle rejection
  await db
    .update(verificationRequests)
    .set({
      status: "rejected",
      verifiedAt: new Date(),
      verifiedBy: adminChatId.toString()
    })
    .where(eq(verificationRequests.id, requestId));

  // Notify user
  await safeSendMessage(parseInt(request.telegramId),
    "❌ Your verification request has been rejected. Please ensure you provided the correct Goated username and try again.",
    {},
    'high'
  );
};

// Bot event handlers setup
const setupBotEventHandlers = () => {
  if (!bot) return;

  // Enhanced connection verification
  bot.getMe().then((botInfo) => {
    console.log(`✅ Bot connected successfully as @${botInfo.username}`);
    debugLog("Bot info:", JSON.stringify(botInfo, null, 2));
    reconnectAttempts = 0;
  }).catch((error) => {
    console.error("❌ Connection failed:", error);
    handleReconnection();
  });

  // Monitor bot permissions in groups
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

// Health check implementation
const startHealthCheck = () => {
  if (!bot) return;

  setInterval(async () => {
    try {
      const startTime = Date.now();
      const response = await bot.getMe();
      if (response) {
        healthCheckFailures = 0;
        debugLog("Health check passed");
      }
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

// Setup command handlers
const setupCommandHandlers = () => {
  if (!bot) return;

  //Start, Help, Verify, Stats, Leaderboard commands are handled in handleCommand

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

const startHealthCheck = () => {
  if (!bot) return;

  setInterval(async () => {
    try {
      const startTime = Date.now();
      const response = await bot.getMe();
      if (response) {
        healthCheckFailures = 0;
        debugLog("Health check passed");
      }
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

// Initialize and export bot functionality
export {
  initializeBot,
  handleUpdate,
  handleMessage,
  handleCallbackQuery,
  safeSendMessage,
  handleVerifyCommand,
  handleStatsCommand,
  handleLeaderboardCommand
};

const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  });
};

// Initialize and export the bot instance
const botInstance = initializeBot();

// Export the bot instance and helper functions
export { botInstance as bot, safeSendMessage, initializeBot };

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