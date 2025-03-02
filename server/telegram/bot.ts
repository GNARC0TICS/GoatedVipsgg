import TelegramBot from 'node-telegram-bot-api';
import type { Message as TelegramMessage, ChatMember, ChatPermissions as TelegramChatPermissions } from 'node-telegram-bot-api';
import { db } from '@db';
import { eq } from 'drizzle-orm';
import * as schema from '../../db/schema';
import * as telegramSchema from '../../db/schema/telegram';

// Extract schema entities to avoid import issues
const { users } = schema;
const { telegramUsers, verificationRequests, challenges, challengeEntries } = telegramSchema;
import { scheduleJob } from 'node-schedule';
import { randomUUID } from 'crypto';

// Type declarations - keep minimal for now
type Message = TelegramMessage;
type ChatPermissions = TelegramChatPermissions;

console.log('[Telegram Bot] Loading bot module...');

// Singleton implementation with proper instance tracking
let botInstance: TelegramBot | null = null;
let isPolling = false;

// Ensure environment variables are properly loaded
import { config } from 'dotenv';
config(); // Reload environment variables

// Config validation
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('[Telegram Bot] TELEGRAM_BOT_TOKEN is not provided. Bot will not function.');
  // Instead of throwing, we'll return early and not initialize the bot
  // This allows the rest of the application to continue running
  // throw new Error('TELEGRAM_BOT_TOKEN must be provided');
} else {
  console.log('[Telegram Bot] Token validation successful');
}

// Check for allowed group IDs
const allowedGroups = process.env.ALLOWED_GROUP_IDS?.split(',') || [];
console.log(`[Telegram Bot] Configured allowed groups: ${allowedGroups.length ? allowedGroups.join(', ') : 'None'}`);

// Create bot instance with proper error handling
function createBot(): TelegramBot {
  if (botInstance) {
    console.log('[Telegram Bot] Using existing instance');
    return botInstance;
  }

  console.log('[Telegram Bot] Creating new bot instance...');

  // Ensure we have a valid token string for the constructor
  const validToken = token || 'placeholder_token_for_initialization';

  // Create with polling disabled initially to avoid instant conflicts
  const bot = new TelegramBot(validToken, { polling: false });

  // Handle polling errors
  bot.on('polling_error', (error) => {
    console.error(`[Telegram Bot] Polling error: ${error.message}`);

    // If we get a conflict error, stop polling to prevent cascading errors
    if (error.message.includes('409 Conflict')) {
      console.log('[Telegram Bot] Detected polling conflict, stopping polling');
      bot.stopPolling().catch(e => {
        console.error('[Telegram Bot] Error stopping polling after conflict:', e);
      });
      isPolling = false;

      // Wait and attempt to restart polling
      setTimeout(() => {
        if (!isPolling) {
          console.log('[Telegram Bot] Attempting to restart polling after conflict');
          startPolling(bot);
        }
      }, 5000);
    }
  });

  // Store the instance
  botInstance = bot;
  return bot;
}

// Start polling with error handling
function startPolling(bot: TelegramBot): void {
  if (isPolling) {
    console.log('[Telegram Bot] Already polling, ignoring start request');
    return;
  }

  console.log('[Telegram Bot] Starting polling...');
  bot.startPolling({ restart: false })
    .then(() => {
      console.log('[Telegram Bot] Polling started successfully');
      isPolling = true;
    })
    .catch(error => {
      console.error('[Telegram Bot] Failed to start polling:', error);
      isPolling = false;

      // Try again after delay
      setTimeout(() => startPolling(bot), 5000);
    });
}

// Create and initialize the bot only if token is available
let bot: TelegramBot;
if (token) {
  bot = createBot();
  startPolling(bot);
} else {
  // Create a dummy bot that logs operations but doesn't actually connect to Telegram
  // This allows the application to continue running even without the Telegram functionality
  console.log('[Telegram Bot] Creating dummy bot instance due to missing token');
  bot = {
    sendMessage: (chatId: number | string, text: string) => {
      console.log(`[Telegram Bot DUMMY] Would send to ${chatId}: ${text}`);
      return Promise.resolve({ message_id: 0 } as any);
    },
    on: () => {},
    onText: () => {},
  } as unknown as TelegramBot;
}

// Simple ping command to verify bot is working
bot.onText(/\/ping/, (msg) => {
  console.log('[Telegram Bot] Received ping command');
  bot.sendMessage(msg.chat.id, 'pong!').then(() => {
    console.log('[Telegram Bot] Sent pong response');
  }).catch(err => {
    console.error('[Telegram Bot] Error sending pong:', err);
  });
});

// Start command to initialize interaction with the bot
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from?.first_name || 'there';
  console.log(`[Telegram Bot] Received start command from ${msg.from?.username || 'unknown user'}`);

  try {
    const welcomeMessage = `👋 *Welcome to GoatedVIPs Bot, ${firstName}\\!*\n\n`
      + `I'm your assistant for Goated\\-related services\\.\n\n`
      + `*What can I do for you?*\n`
      + `• Track your wager statistics\n`
      + `• Check your race position\n`
      + `• View leaderboards\n`
      + `• Get affiliate links\n\n`
      + `Type /help to see all available commands\\.`;

    await bot.sendMessage(chatId, welcomeMessage, {
      parse_mode: 'MarkdownV2'
    });
    console.log('[Telegram Bot] Sent welcome message');
  } catch (error) {
    console.error('[Telegram Bot] Error sending welcome message:', error);
    // Fallback to plain text if markdown fails
    bot.sendMessage(chatId, `👋 Welcome to GoatedVIPs Bot, ${firstName}! Type /help to see available commands.`)
      .catch(err => console.error('[Telegram Bot] Error sending fallback welcome message:', err));
  }
});

// Constants
const ADMIN_TELEGRAM_IDS = ['1689953605'];
const ALLOWED_GROUP_IDS = process.env.ALLOWED_GROUP_IDS?.split(',') || [];

// Define constants
const CONVERSATION_COOLDOWN = 10000; // 10 seconds between AI responses
const BEGGING_PATTERNS = {
  DIRECT: [
    'give me', 'send me', 'need money', 'spare some',
    'can send?', 'sen pls', 'pls send', 'send pls',
    'send coin', 'gimme', 'hook me up', 'need help$'
  ],
  SUBTLE: [
    'broke', 'poor', 'help me out', 'anything helps',
    'no money', 'struggling', 'desperate'
  ],
  SPAM: [
    'copy paste', 'forwarded message', 'chain message',
    'spam', 'bulk message'
  ],
  SHARING: [
    'airdrop', 'giveaway', 'sharing',
    'giving away', 'drop', 'contest'
  ]
} as const;

// Warning messages for begging
const BEGGING_WARNINGS = [
  "⚠️ @{username} Begging is not allowed in this group. Focus on participating in races and events instead!",
  "⚠️ Hey @{username}, we don't allow begging here. Try joining our monthly races to earn rewards!",
  "⚠️ @{username} This is a warning for begging. Join the community events instead of asking for handouts!",
  "⚠️ @{username} No begging allowed! Check /help to see how you can earn through races and challenges!"
] as const;

// Bot personality traits
const BOT_PERSONALITY = {
  FRIENDLY: ['Hey!', 'Hi there!', 'Hello!', 'Sup!'],
  HELPFUL: ['Let me help you with that!', 'I can assist with that!', 'I got you!'],
  PLAYFUL: ['😎', '🎮', '🎲'],
  CONGRATULATORY: ['Well done!', 'Amazing!', 'Great job!', 'Fantastic!']
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
  state: 'active' | 'inactive';
  lastRun?: number;
}

// Global state
declare global {
  var scheduledJobs: Map<string, any>;
  var recurringMessages: Map<string, RecurringMessage>;
  var activeChats: Map<number, {
    lastMessage: string;
    timestamp: number;
  }>;
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
  if (!text) return '';
  return text.trim();
}

function validateText(text: string | undefined | null, error = 'Text is required'): string {
  const sanitized = sanitizeText(text);
  if (!sanitized) throw new Error(error);
  return sanitized;
}

export function validateUsername(username?: string | null): string {
  return validateText(username, 'Username is required');
}

// Message and text validation helpers
function isBeggingMessage(text: string | undefined | null): boolean {
  const lowerText = sanitizeText(text).toLowerCase();

  if (BEGGING_PATTERNS.DIRECT.some(pattern => lowerText.includes(pattern))) {
    return true;
  }

  if (BEGGING_PATTERNS.SUBTLE.some(pattern => lowerText.includes(pattern))) {
    return true;
  }

  const currencyPattern = /[\$\€\£\¥]|([0-9]+\s*(dollars|euros|usd|coins|tips))/gi;
  const currencyMatches = lowerText.match(currencyPattern) || [];
  if (currencyMatches.length > 0 && BEGGING_PATTERNS.SUBTLE.some(pattern => lowerText.includes(pattern))) {
    return true;
  }

  return false;
}

// Recurring message helpers
async function scheduleRecurringMessage(message: RecurringMessage): Promise<void> {
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
    console.error('Error scheduling message:', error);
    throw error;
  }
}

// Message management functions
function createRecurringMessage(data: Partial<RecurringMessage> & { chatId: number }): RecurringMessage {
  return {
    id: getUniqueId(),
    message: data.message || '',
    schedule: data.schedule || '0 * * * *',
    chatId: data.chatId,
    enabled: data.enabled ?? true,
    targetGroups: data.targetGroups || []
  };
}

async function muteUser(chatId: number | string, userId: number, duration: number): Promise<void> {
  const untilDate = Math.floor(Date.now() / 1000) + duration;
  const targetChatId = typeof chatId === 'string' ? parseInt(chatId, 10) : chatId;

  const mute = {
    until_date: untilDate,
    permissions: {
      can_send_messages: false,
      can_send_other_messages: false,
      can_add_web_page_previews: false,
      can_change_info: false,
      can_invite_users: false,
      can_pin_messages: false,
      can_send_polls: false
    } as TelegramChatPermissions
  };

  await bot.restrictChatMember(targetChatId, userId, mute);
}

// Command handlers
// Help command
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;

  let message = `🐐 *Welcome to Goated Stats Bot\\!*\n\n`;

  if (msg.from?.username === 'xGoombas') {
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
    parse_mode: 'MarkdownV2'
  });
});

// Check stats command
bot.onText(/\/check_stats (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();
  const username = validateUsername(match?.[1]?.trim());

  if (!telegramId) {
    return bot.sendMessage(chatId, 'Could not identify user.');
  }

  try {
    if (msg.from?.username !== 'xGoombas') {
      const requester = await db.select()
        .from(telegramUsers)
        .where(eq(telegramUsers.telegramId, telegramId))
        .execute();

      if (!requester?.[0]?.isVerified ||
        requester[0].goatedUsername?.toLowerCase() !== username.toLowerCase()) {
        return bot.sendMessage(chatId,
          'You can only check your own stats after verification.');
      }
    }

    const apiUrl = new URL('http://0.0.0.0:5000/api/affiliate/stats');
    apiUrl.searchParams.append('username', username);

    const response = await fetch(apiUrl.toString(), {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
    });

    const data = await response.json() as ApiResponse<MonthlyData>;
    const transformedData = data?.data?.monthly?.data;
    let userStats = transformedData?.find((u: GoatedUser) =>
      u.name.toLowerCase() === username.toLowerCase()
    );

    if (!userStats && msg.from?.username === 'xGoombas' && username.startsWith('@')) {
      const cleanUsername = username.substring(1);
      const telegramUser = await db.select()
        .from(telegramUsers)
        .where(eq(telegramUsers.telegramUsername, cleanUsername))
        .execute();

      if (telegramUser?.[0]?.goatedUsername) {
        userStats = transformedData?.find((u: GoatedUser) =>
          u.name.toLowerCase() === telegramUser[0].goatedUsername?.toLowerCase()
        );
      }
    }

    if (!userStats) {
      return bot.sendMessage(chatId, 'User not found.');
    }

    const message = `📊 Stats for ${userStats.name}:\n
Monthly Wager: $${(userStats.wagered?.this_month || 0).toLocaleString()}
Weekly Wager: $${(userStats.wagered?.this_week || 0).toLocaleString()}
Daily Wager: $${(userStats.wagered?.today || 0).toLocaleString()}
All-time Wager: $${(userStats.wagered?.all_time || 0).toLocaleString()}`;

    return bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Error checking stats:', error);
    return bot.sendMessage(chatId, 'An error occurred while fetching stats.');
  }
});

// Admin commands
bot.onText(/\/makeadmin/, async (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from?.username;

  if (username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can use this command.');
  }

  try {
    const [user] = await db
      .update(users)
      .set({ isAdmin: true })
      .where(eq(users.username, username))
      .returning();

    if (user) {
      await bot.sendMessage(chatId, '✅ Admin privileges granted successfully!');
    } else {
      await bot.sendMessage(chatId, '❌ Failed to grant admin privileges. Please try again.');
    }
  } catch (error) {
    console.error('Error granting admin privileges:', error);
    await bot.sendMessage(chatId, '❌ An error occurred while granting admin privileges.');
  }
});

// Admin command to reject a verification request
bot.onText(/\/reject_user (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const adminUsername = msg.from?.username;

  if (adminUsername !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can use this command.');
  }

  if (!match?.[1]) {
    return bot.sendMessage(chatId, '❌ Please provide a Telegram username or ID.');
  }

  let telegramId = match[1];
  // If username format is provided (@username), remove @ and find the user's ID
  if (telegramId.startsWith('@')) {
    telegramId = telegramId.substring(1);
    const user = await db.select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramUsername, telegramId))
      .execute();

    if (!user?.[0]) {
      return bot.sendMessage(chatId, '❌ User not found with that username.');
    }
    telegramId = user[0].telegramId;
  }

  try {
    // Update verification request status
    const [request] = await db
      .update(verificationRequests)
      .set({ status: 'rejected', updatedAt: new Date() })
      .where(eq(verificationRequests.telegramId, telegramId))
      .returning();

    if (!request) {
      return bot.sendMessage(chatId, '❌ Verification request not found.');
    }

    // Notify user privately
    await bot.sendMessage(telegramId,
      '❌ Your verification request has been rejected.\n' +
      'Please ensure you\'re using the correct Goated username and try again.\n' +
      'If you need help, contact @xGoombas.');

    return bot.sendMessage(chatId, `✅ User ${request.goatedUsername}'s verification request has been rejected.`);
  } catch (error) {
    console.error('Error rejecting verification:', error);
    return bot.sendMessage(chatId, '❌ Error rejecting verification request.');
  }
});

// Admin command to broadcast message
bot.onText(/\/broadcast (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const adminUsername = msg.from?.username;

  if (adminUsername !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can use this command.');
  }

  if (!match?.[1]) {
    return bot.sendMessage(chatId, '❌ Please provide a message to broadcast.');
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

    return bot.sendMessage(chatId,
      `📢 Broadcast complete!\n✅ Sent: ${successCount}\n❌ Failed: ${failureCount}`);
  } catch (error) {
    console.error('Error broadcasting message:', error);
    return bot.sendMessage(chatId, '❌ Error broadcasting message.');
  }
});

// Leaderboard command - fetch and display leaderboard data
bot.onText(/\/leaderboard/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    console.log("[Telegram Bot] Fetching leaderboard data for /leaderboard command");

    // Use our internal API endpoint (no external API call needed)
    const apiBaseUrl = 'http://localhost:5000';

    // Fetch current race data which has the most accurate monthly data
    const raceResponse = await fetch(`${apiBaseUrl}/api/wager-races/current`);
    if (!raceResponse.ok) {
      throw new Error(`Race API request failed: ${raceResponse.status}`);
    }

    const raceData = await raceResponse.json();

    if (!raceData || !raceData.participants || raceData.participants.length === 0) {
      // Fallback to regular leaderboard if race data isn't available
      const leaderboardResponse = await fetch(`${apiBaseUrl}/api/affiliate/stats`);
      if (!leaderboardResponse.ok) {
        throw new Error(`Leaderboard API request failed: ${leaderboardResponse.status}`);
      }

      const leaderboardData = await leaderboardResponse.json();
      const monthlyData = leaderboardData.data.monthly.data.slice(0, 10);

      if (!monthlyData || monthlyData.length === 0) {
        await bot.sendMessage(chatId, "No leaderboard data available at the moment.");
        return;
      }

      let message = "🏆 *Monthly Race Leaderboard* 🏆\n\n";

      monthlyData.forEach((player, index) => {
        const position = index + 1;
        const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}\\)`;
        message += `${medal} *${escapeMarkdownV2(player.name || 'Unknown')}*: $${escapeMarkdownV2(formatNumber(player.wagered?.this_month || 0))}\n`;
      });

      message += "\n👉 [View full leaderboard on GoatedVIPs](https://goatedvips.replit.app/leaderboard?period=monthly)";

      const options = {
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [{ text: 'Refresh', callback_data: 'refresh_leaderboard' }],
            [{ text: 'My Stats', callback_data: 'my_stats' }]
          ]
        })
      };

      await bot.sendMessage(chatId, message, options);
      return;
    }

    // Use race participants data which is more accurate
    let message = "🏆 *Monthly Race Leaderboard* 🏆\n\n";
    message += `Prize Pool: $${escapeMarkdownV2(formatNumber(raceData.prizePool))}\n\n`;

    raceData.participants.forEach((player, index) => {
      const position = index + 1;
      const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}\\)`;
      message += `${medal} *${escapeMarkdownV2(player.name || 'Unknown')}*: $${escapeMarkdownV2(formatNumber(player.wagered || 0))}\n`;
    });

    // Add time left in race if available
    if (raceData.endDate) {
      const endDate = new Date(raceData.endDate);
      const now = new Date();
      const diffTime = endDate.getTime() - now.getTime();

      if (diffTime > 0) {
        const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        message += `\n⏱️ *Time Left*: ${days}d ${hours}h\n`;
      }
    }

    message += "\n👉 [View full details on GoatedVIPs](https://goatedvips.replit.app/wager-races)";

    const options = {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [{ text: 'Refresh', callback_data: 'refresh_leaderboard' }],
          [{ text: 'My Stats', callback_data: 'my_stats' }]
        ]
      })
    };

    await bot.sendMessage(chatId, message, options);

    console.log("[Telegram Bot] Successfully sent leaderboard data");
  } catch (error) {
    console.error("[Telegram Bot] Error fetching leaderboard:", error);
    await bot.sendMessage(chatId, "Sorry, I couldn't fetch the leaderboard data right now. Please try again later.");
  }
});

// Helper function to escape markdown v2 special characters
function escapeMarkdownV2(text) {
  if (!text) return '';
  return String(text).replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

// Format number with commas for thousands
function formatNumber(num) {
  if (typeof num !== 'number') {
    num = parseFloat(num) || 0;
  }
  return num.toLocaleString('en-US');
}

// Check bot status - this can be useful for debugging
export function getBotStatus() {
  return {
    isInitialized: !!botInstance,
    isPolling,
    telegramToken: !!token,
    commands: bot.getMyCommands()
  };
}

// Export bot instance and stop function
export default bot;

export async function stopBot() {
  try {
    console.log('[Telegram Bot] Stopping polling...');
    if (botInstance && isPolling) {
      await bot.stopPolling();
      console.log('[Telegram Bot] Polling stopped');
      isPolling = false;
    }
  } catch (error) {
    console.error('[Telegram Bot] Error stopping polling:', error);
  }
}

// Handle cleanup on server shutdown
process.on('SIGINT', stopBot);
process.on('SIGTERM', stopBot);

// Global callback query handler
bot.on('callback_query', async (callbackQuery) => {
  const action = callbackQuery.data;
  const msg = callbackQuery.message;

  console.log(`[Telegram Bot] Received callback: ${action}`);

  switch (action) {
    case 'refresh_leaderboard':
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: "Refreshing leaderboard data..."
      });
      await leaderboardHandler(msg);
      break;

    case 'my_stats':
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: "Fetching your stats..."
      });
      await statsHandler(msg);
      break;

    default:
      await bot.answerCallbackQuery(callbackQuery.id);
      break;
  }
});