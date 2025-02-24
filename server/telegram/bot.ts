/**
 * GOATEDVIPS TELEGRAM BOT
 * Main bot implementation file
 */

import TelegramBot from 'node-telegram-bot-api';
import type { Message as TelegramMessage, ChatMember, ChatPermissions as TelegramChatPermissions } from 'node-telegram-bot-api';
import { db } from '@db';
import { eq } from 'drizzle-orm';
import { users } from '../../db/schema';
import { telegramUsers, verificationRequests, challenges, challengeEntries, botResponses } from '../../db/schema/telegram';
import { scheduleJob } from 'node-schedule';
import { randomUUID } from 'crypto';
import { nlpService } from './nlp-service';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Type declarations
type Message = TelegramMessage;
type ChatPermissions = TelegramChatPermissions;

const CUSTOM_EMOJIS = {
  error: "❌",      // Error/failure indicators
  success: "✅",    // Success/completion indicators
  vip: "👑",       // VIP/premium features
  stats: "📊",     // Statistics and data
  race: "🏃",      // Wager races
  play: "🎮",      // Gaming actions
  bonus: "🎁",     // Bonus codes/rewards
  challenge: "🎯", // Challenges/competitions
  verify: "✨",    // Verification process
  refresh: "🔄",   // Refresh/update actions
  bell: "🔔",      // Notifications
  sparkle: "✨"    // General sparkle effect
};

// Helper functions
async function sendMessageWithEmoji(
  bot: TelegramBot,
  chatId: number,
  emoji: string,
  message: string,
  options?: TelegramBot.SendMessageOptions
): Promise<TelegramBot.Message | void> {
  try {
    return await bot.sendMessage(chatId, `${emoji} ${message}`, options);
  } catch (error) {
    logError(error, "Error sending message with emoji");
  }
}

function escapeMarkdown(text: string): string {
  // Characters that need to be escaped in MarkdownV2: . ! ( ) [ ] { } < > = + - # | _ ~ ` > *
  return text.replace(/[._*[\]()~`>#+=|{}<>-]/g, '\\$&');
}

// Bot initialization
console.log('[Telegram Bot] Loading bot module...');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN must be provided');
}
console.log('[Telegram Bot] Token validation successful');

// Create singleton bot instance
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

// Constants
const MONITORED_CHANNELS = ['@Goatedcom'];
const AFFILIATE_LINK = 'https://www.Goated.com/r/REDEEM';

const BOT_COMMANDS = [
  { command: 'start', description: '🚀 Start using the bot' },
  { command: 'verify', description: '🔐 Link your Goated account' },
  { command: 'stats', description: '📊 Check your wager stats' },
  { command: 'race', description: '🏁 View your race position' },
  { command: 'leaderboard', description: '🏆 See top players' },
  { command: 'play', description: '🎮 Play on Goated with our affiliate link' },
  { command: 'website', description: '🌐 Visit GoatedVIPs.gg' },
  { command: 'help', description: '❓ Get help using the bot' }
];

const ADMIN_COMMANDS = [
  { command: 'pending', description: '📝 View pending verifications' },
  { command: 'broadcast', description: '📢 Send announcement to all users' },
  { command: 'approve', description: '✅ Approve a verification request' },
  { command: 'reject', description: '❌ Reject a verification request' },
  { command: 'createbonus', description: '🎁 Create a bonus code' },
  { command: 'createchallenge', description: '🎯 Create a challenge' }
];

// Initialize bot with event handlers
async function initializeBot() {
  try {
    console.log('[Telegram Bot] Registering event handlers...');

    // Ping command
    bot.onText(/\/ping/, (msg) => {
      console.log('[Telegram Bot] Received ping command');
      sendMessageWithEmoji(bot, msg.chat.id, CUSTOM_EMOJIS.success, 'pong!');
    });

    // Help command
    bot.onText(/\/help/, async (msg) => {
      console.log('[Telegram Bot] Received help command');
      const chatId = msg.chat.id;
      const isAdmin = msg.from?.username === 'xGoombas';

      let message = `${CUSTOM_EMOJIS.vip} *Welcome to Goated Stats Bot\\!*\n\n`;

      message += `*Available Commands:*\n`;
      for (const cmd of BOT_COMMANDS) {
        message += `• /${cmd.command} \\- ${escapeMarkdown(cmd.description)}\n`;
      }
      if (isAdmin) {
        message += `\n*Admin Commands:*\n`;
        for (const cmd of ADMIN_COMMANDS) {
          message += `• /${cmd.command} \\- ${escapeMarkdown(cmd.description)}\n`;
        }
      }
      message += `\nNeed help\\? Contact @xGoombas for support\\.`;

      await bot.sendMessage(chatId, message, { parse_mode: 'MarkdownV2' });
    });

    // Teaching command
    bot.onText(/\/teach (.+)=>(.+)/, async (msg, match) => {
      console.log('[Telegram Bot] Received teach command');
      if (msg.from?.username !== 'xGoombas') {
        return sendMessageWithEmoji(bot, msg.chat.id, CUSTOM_EMOJIS.error, 'Only authorized users can teach me new responses.');
      }

      if (!match?.[1] || !match?.[2]) {
        return sendMessageWithEmoji(bot, msg.chat.id, CUSTOM_EMOJIS.error, 'Please use the format: /teach pattern=>response');
      }

      const pattern = match[1].trim();
      const response = match[2].trim();

      try {
        await nlpService.addResponse(pattern, response, msg.from.username);
        await sendMessageWithEmoji(bot, msg.chat.id, CUSTOM_EMOJIS.success, 'I learned a new response pattern!');
      } catch (error) {
        console.error('Error teaching response:', error);
        await sendMessageWithEmoji(bot, msg.chat.id, CUSTOM_EMOJIS.error, 'Failed to learn the new response.');
      }
    });

    // Message handler
    bot.on('message', async (msg) => {
      if (!msg.text) return;
      console.log('[Telegram Bot] Received message:', msg.text);

      const messageText = msg.text.toLowerCase();
      const chatId = msg.chat.id;
      const username = msg.from?.username;
      const telegramId = msg.from?.id?.toString();

      if (!telegramId) return;

      try {
        await rateLimiter.consume(telegramId);

        // Check for begging patterns
        if (isBeggingMessage(messageText)) {
          const randomWarning = BEGGING_WARNINGS[Math.floor(Math.random() * BEGGING_WARNINGS.length)];
          const warningMessage = randomWarning.replace('{username}', username || 'user');
          await sendMessageWithEmoji(bot, chatId, CUSTOM_EMOJIS.error, warningMessage);
          return;
        }

        // Process message with NLP service
        const processed = nlpService.processMessage(messageText);
        const bestMatch = await nlpService.findBestResponse(processed);

        // If we found a good match, use it
        if (bestMatch) {
          await bot.sendMessage(chatId, bestMatch.responseText);
          await nlpService.recordInteraction(messageText, bestMatch.responseId, telegramId);
          return;
        }

        // Check if bot is mentioned or replied to
        const botMention = `@${await bot.getMe().then(me => me.username)}`;
        const isBotMentioned = messageText.includes(botMention.toLowerCase()) ||
                             msg.reply_to_message?.from?.id === (await bot.getMe()).id;

        if (isBotMentioned) {
          const responses = [
            `${CUSTOM_EMOJIS.vip} Hey there! Need help? Try /help to see what I can do!`,
            `${CUSTOM_EMOJIS.stats} Looking for stats? Use /stats to check your progress!`,
            `${CUSTOM_EMOJIS.race} Want to see the leaderboard? Just type /leaderboard!`,
            `${CUSTOM_EMOJIS.bell} Need assistance? Feel free to ask @xGoombas!`
          ];

          const randomResponse = responses[Math.floor(Math.random() * responses.length)];
          await bot.sendMessage(chatId, randomResponse);
        }
      } catch (error) {
        console.error('[Telegram Bot] Error processing message:', error);
        await sendMessageWithEmoji(bot, chatId, CUSTOM_EMOJIS.error, 'Rate limit exceeded. Please wait before sending more messages.');
      }
    });

    // Channel post handler
    bot.on('channel_post', async (msg) => {
      if (!msg.chat.username || !MONITORED_CHANNELS.includes('@' + msg.chat.username)) return;

      try {
        const updates = await bot.getUpdates();
        const uniqueGroupIds = getUniqueGroupIds(updates);

        let messageText = msg.text || '';
        messageText = messageText.replace(
          /https?:\/\/(?:www\.)?goated\.com\/[^\s]*/gi,
          AFFILIATE_LINK
        );

        // Forward to all groups where bot is admin
        for (const groupId of uniqueGroupIds) {
          try {
            const admins = await bot.getChatAdministrators(groupId);
            const botIsMember = admins.some(admin =>
              admin.user.id === (bot.options?.polling?.params?.id || 0)
            );

            if (botIsMember) {
              await sendMessageWithEmoji(bot, groupId, CUSTOM_EMOJIS.vip, `*Announcement from Goated*\n\n${messageText}`, {
                parse_mode: "Markdown",
                disable_web_page_preview: false
              });
            }
          } catch (error) {
            logError(error, `Failed to forward to group ${groupId}`);
          }
        }
      } catch (error) {
        logError(error, "Channel post forwarding error");
      }
    });

    // Rate limiter setup
    const rateLimiter = new RateLimiterMemory({
      points: 20,
      duration: 60
    });

    console.log('[Telegram Bot] Event handlers registered successfully');
    return true;
  } catch (error) {
    console.error('[Telegram Bot] Error initializing bot:', error);
    return false;
  }
}

// Warning messages for begging
const BEGGING_WARNINGS = [
  "⚠️ @{username} Begging is not allowed in this group. Focus on participating in challenges and events instead!",
  "⚠️ Hey @{username}, we don't allow begging here. Try joining our monthly races to earn rewards!",
  "⚠️ @{username} This is a warning for begging. Join the community events instead of asking for handouts!",
  "⚠️ @{username} No begging allowed! Check /help to see how you can earn through races and challenges!"
] as const;

// Helper function to detect begging
function isBeggingMessage(text: string | undefined | null): boolean {
  const lowerText = text?.toLowerCase().trim() || '';

  const BEGGING_PATTERNS = {
    DIRECT: [
      'give me', 'send me', 'need money', 'spare some',
      'can send?', 'sen pls', 'pls send', 'send pls',
      'send coin', 'gimme', 'hook me up', 'need help$'
    ],
    SUBTLE: [
      'broke', 'poor', 'help me out', 'anything helps',
      'no money', 'struggling', 'desperate'
    ]
  };

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

// Initialize bot
initializeBot().then((success) => {
  if (success) {
    console.log('[Telegram Bot] Bot initialization complete');
  } else {
    console.error('[Telegram Bot] Failed to initialize bot');
  }
});

// Helper functions
function getUniqueGroupIds(updates: TelegramBot.Update[]): number[] {
  const groupIds = new Set<number>();
  for (const update of updates) {
    if (update.message?.chat.type === 'group' || update.message?.chat.type === 'supergroup') {
      if (update.message.chat.id) {
        groupIds.add(update.message.chat.id);
      }
    }
  }
  return Array.from(groupIds);
}

function logError(error: unknown, context: string = '') {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`[ERROR] ${context}: ${errorMessage}`);
}

// Export bot instance
export { bot as default };

function validateUsername(username?: string | null): string {
  return validateText(username, 'Username is required');
}

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

interface RecurringMessage {
  id: string;
  message: string;
  schedule: string;
  chatId: number;
  enabled: boolean;
  targetGroups: string[];
}

interface MessageState {
  id: string;
  state: 'active' | 'inactive';
  lastRun?: number;
}

declare global {
  var bot: TelegramBot;
  var scheduledJobs: Map<string, Job>;
  var recurringMessages: Map<string, RecurringMessage>;
  var activeChats: Map<number, {
    lastMessage: string;
    timestamp: number;
  }>;
}

if (!global.scheduledJobs) global.scheduledJobs = new Map();
if (!global.recurringMessages) global.recurringMessages = new Map();
if (!global.activeChats) global.activeChats = new Map();

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

interface Job {
  cancel(): void;
}

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
      await sendMessageWithEmoji(bot, chatId, CUSTOM_EMOJIS.success, 'Admin privileges granted successfully!');
    } else {
      await sendMessageWithEmoji(bot, chatId, CUSTOM_EMOJIS.error, 'Failed to grant admin privileges. Please try again.');
    }
  } catch (error) {
    console.error('Error granting admin privileges:', error);
    await sendMessageWithEmoji(bot, chatId, CUSTOM_EMOJIS.error, 'An error occurred while granting admin privileges.');
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

    return sendMessageWithEmoji(bot, chatId, CUSTOM_EMOJIS.success, `User ${request.goatedUsername}'s verification request has been rejected.`);
  } catch (error) {
    console.error('Error rejecting verification:', error);
    return sendMessageWithEmoji(bot, chatId, CUSTOM_EMOJIS.error, 'Error rejecting verification request.');
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

    return sendMessageWithEmoji(bot, chatId, CUSTOM_EMOJIS.success, `Broadcast complete!\n✅ Sent: ${successCount}\n❌ Failed: ${failureCount}`);
  } catch (error) {
    console.error('Error broadcasting message:', error);
    return sendMessageWithEmoji(bot, chatId, CUSTOM_EMOJIS.error, 'Error broadcasting message.');
  }
});

// Update logging to fix Zod validation error
function log(level: "error" | "info" | "debug", message: any) {
  console.log(`[${level.toUpperCase()}] ${message}`);
}

// Add cleanup handler
function cleanup() {
  if (botInstance && isPolling) {
    try {
      botInstance.stopPolling();
      isPolling = false;
      log("info", "Bot polling stopped");
    } catch (error) {
      log("error", `Error stopping bot: ${error}`);
    }
  }
}

// Handle process termination
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);


// Add proper type for bot options
interface ExtendedTelegramBot extends TelegramBot {
  options: {
    polling?: {
      params?: {
        id: number;
      };
    };
  };
}

let botInstance: ExtendedTelegramBot | null = null;
let isPolling = false;