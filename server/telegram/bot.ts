import TelegramBot from 'node-telegram-bot-api';
import type { Message as TelegramMessage, ChatMember, ChatPermissions as TelegramChatPermissions } from 'node-telegram-bot-api';
import { db } from '@db';
import { eq } from 'drizzle-orm';
import { users } from '../../db/schema';
import { telegramUsers, verificationRequests, challenges, challengeEntries } from '../../db/schema/telegram';
import { scheduleJob } from 'node-schedule';
import { randomUUID } from 'crypto';

// Type declarations - keep minimal for now
type Message = TelegramMessage;
type ChatPermissions = TelegramChatPermissions;

console.log('[Telegram Bot] Loading bot module...');

// Config validation
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN must be provided');
}
console.log('[Telegram Bot] Token validation successful');

// Create singleton bot instance with proper logging
let bot: TelegramBot;
if (!global.bot) {
  console.log('[Telegram Bot] Creating new bot instance...');
  bot = new TelegramBot(token, { polling: true });
  global.bot = bot;
  console.log('[Telegram Bot] Created with polling enabled');
} else {
  bot = global.bot;
  console.log('[Telegram Bot] Using existing instance');
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
  var bot: TelegramBot;
  var scheduledJobs: Map<string, Job>;
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

  let message = `👋 Welcome to Goombas x Goated Vips Bot\\!\n\n`;
  message += `⚠️ You must be an affiliate to use this Bot\\.\n`;
  message += `To get started, I'll need to verify your Goated\\.com account username to proceed\\.\n\n`;

  if (msg.from?.username === 'xGoombas') {
    message += `*Admin Commands:*\n`;
    message += `• /broadcast \\- Send message to all users\n`;
    message += `• /group\\_message \\- Send message to group\n`;
    message += `• /user\\_info \\- Get user information\n`;
    message += `• /pending \\- View verification requests\n`;
    message += `• /verify\\_user \\- Verify a user\n`;
    message += `• /reject\\_user \\- Reject a verification\n\n`;
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

// Export bot instance and stop function
export default bot;

export async function stopBot() {
  try {
    await bot.stopPolling();
    console.log('[Telegram Bot] Polling stopped');
  } catch (error) {
    console.error('[Telegram Bot] Error stopping polling:', error);
  }
}

// Handle cleanup on server shutdown
process.on('SIGINT', stopBot);
process.on('SIGTERM', stopBot);