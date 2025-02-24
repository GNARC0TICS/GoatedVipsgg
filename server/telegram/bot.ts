import TelegramBot, { Message, ChatMember } from 'node-telegram-bot-api';
import { db } from '@db';
import { eq } from 'drizzle-orm';
import { telegramUsers, verificationRequests, challenges, challengeEntries } from '@db/schema/telegram';
import { users } from '@db/schema';
import '@types/node-schedule';
import { scheduleJob } from 'node-schedule';
import crypto from 'crypto';


// Types for bot
interface Challenge {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  prizePool: number;
}

interface ChallengeEntry {
  id: string;
  userId: string;
  challengeId: string;
  score: number;
  rank: number;
  createdAt: Date;
  updatedAt: Date;
}

interface RecurringMessage {
  id: string;
  message: string;
  schedule: string; // cron expression
  targetGroups: string[];
  enabled: boolean;
}

// Create singleton bot instance with polling enabled
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN must be provided');
}

const bot = new TelegramBot(token, { polling: true });
console.log('[Telegram Bot] Created with polling enabled');

// Constants (Removed some less crucial constants for simplification)
const ADMIN_TELEGRAM_IDS = ['1689953605'];
const ALLOWED_GROUP_IDS = process.env.ALLOWED_GROUP_IDS?.split(',') || [];
const SPAM_DETECTION = {
  TIME_WINDOW: 30000, // 30 seconds
  MAX_MESSAGES: 5,    // 5 messages
  MUTE_DURATION: 300, // 5 minutes
  WARNINGS_BEFORE_BAN: 3,
  BAN_DURATION: 86400 // 24 hours
};

const BEGGING_KEYWORDS = [
  'give me', 'please give', 'need money', 'send me',
  'deposit', 'broke', 'need help', 'money please',
  'spare some', 'donation', 'help me'
];


// Helper function to check if a message contains begging
function containsBegging(message: string): boolean {
  return BEGGING_KEYWORDS.some(keyword =>
    message.toLowerCase().includes(keyword.toLowerCase())
  );
}

// Message spam tracking
const messageTracker = new Map<string, { count: number; timestamp: number }>();

// Function to check for spam
function isSpamming(userId: string): boolean {
  const now = Date.now();
  const userMessages = messageTracker.get(userId);

  if (!userMessages) {
    messageTracker.set(userId, { count: 1, timestamp: now });
    return false;
  }

  if (now - userMessages.timestamp > SPAM_DETECTION.TIME_WINDOW) {
    messageTracker.set(userId, { count: 1, timestamp: now });
    return false;
  }

  userMessages.count++;
  if (userMessages.count > SPAM_DETECTION.MAX_MESSAGES) {
    return true;
  }

  return false;
}


// Cleanup function to stop polling
async function stopBot() {
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

// Basic commands
bot.onText(/\/play/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId,
    '🎮 Click here to play on Goated:\nhttps://www.goated.com/r/goatedvips\n\n' +
    '💰 Make sure to use our link to get the best rakeback and rewards!');
});

bot.onText(/\/website/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId,
    '🌐 Visit our website:\nhttps://goatedvips.gg\n\n' +
    '📊 Check leaderboards, tips, and latest promotions!');
});

// Check stats command
bot.onText(/\/check_stats (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();
  const username = match?.[1]?.trim();

  if (!username) {
    return bot.sendMessage(chatId, '❌ Please provide a username to check.');
  }

  try {
    const user = await db.select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramId, telegramId!))
      .execute();

    if (!user?.[0]?.isVerified) {
      return bot.sendMessage(chatId, '❌ You need to verify your account first. Use /verify');
    }

    // Rest of stats checking logic here (This part was removed from the edited snippet, so it's omitted here as well)
    await bot.sendMessage(chatId, `📊 Checking stats for ${username}...`);
  } catch (error) {
    console.error('Error checking stats:', error);
    await bot.sendMessage(chatId, '❌ Error checking stats. Please try again later.');
  }
});


// Help command
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const isAdmin = msg.from?.username === 'xGoombas';

  let message = `*GoatedVIPs Bot Commands*\n\n`;

  if (isAdmin) {
    message += `*Admin Commands:*\n`;
    message += `• /adminpanel \\- Open admin panel\n`;
    message += `• /broadcast \\- Send message to all\n`;
    message += `• /verify\\_user \\- Verify a user\n`;
  }

  message += `*Available Commands:*\n`;
  message += `• /start \\- Get started\n`;
  message += `• /verify \\- Link your account\n`;
  message += `• /stats \\- View statistics\n`;
  message += `• /race \\- Check race position\n`;
  message += `• /leaderboard \\- See top players\n`;
  message += `• /play \\- Play on Goated\n`;
  message += `• /website \\- Visit GoatedVIPs\\.gg\n\n`;
  message += `Need help? Contact @xGoombas`;

  await bot.sendMessage(chatId, message, { parse_mode: 'MarkdownV2' });
});


// Storage for recurring messages
const recurringMessages = new Map<string, RecurringMessage>();

// Helper function to schedule a recurring message
function scheduleRecurringMessage(message: RecurringMessage): void {
  scheduleJob(message.schedule, async () => {
    if (!message.enabled) return;

    for (const groupId of message.targetGroups) {
      try {
        await bot.sendMessage(groupId, message.message);
        console.log(`[Recurring Message] Sent message ${message.id} to group ${groupId}`);
      } catch (error) {
        console.error(`[Recurring Message] Error sending to group ${groupId}:`, error);
      }
    }
  });
}

// Admin command to add recurring message
bot.onText(/\/add_recurring_message/, async (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from?.username;

  if (username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can manage recurring messages.');
  }

  try {
    // Get message details through conversation
    await bot.sendMessage(chatId, 'Please send the message you want to schedule:');

    const messageResponse = await new Promise<Message>((resolve) => {
      const messageHandler = (response: Message) => {
        if (response.chat.id === chatId) {
          bot.removeListener('message', messageHandler);
          resolve(response);
        }
      };
      bot.on('message', messageHandler);
    });

    await bot.sendMessage(chatId, 'Please send the schedule in cron format (e.g., "0 9 * * *" for daily at 9 AM):');

    const scheduleResponse = await new Promise<Message>((resolve) => {
      const scheduleHandler = (response: Message) => {
        if (response.chat.id === chatId) {
          bot.removeListener('message', scheduleHandler);
          resolve(response);
        }
      };
      bot.on('message', scheduleHandler);
    });

    const messageId = crypto.randomUUID();
    const recurringMessage: RecurringMessage = {
      id: messageId,
      message: messageResponse.text || '',
      schedule: scheduleResponse.text || '',
      targetGroups: ALLOWED_GROUP_IDS,
      enabled: true
    };

    recurringMessages.set(messageId, recurringMessage);
    scheduleRecurringMessage(recurringMessage);

    return bot.sendMessage(chatId,
      `✅ Recurring message added successfully!\n` +
      `ID: ${messageId}\n` +
      `Schedule: ${recurringMessage.schedule}\n` +
      `Target Groups: ${recurringMessage.targetGroups.length}`);
  } catch (error) {
    console.error('Error adding recurring message:', error);
    return bot.sendMessage(chatId, '❌ Error setting up recurring message.');
  }
});

// Admin command to list recurring messages
bot.onText(/\/list_recurring_messages/, async (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from?.username;

  if (username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can view recurring messages.');
  }

  const messageList = Array.from(recurringMessages.values())
    .map(message =>
      `🔄 Message ID: ${message.id}\n` +
      `📝 Content: ${message.message}\n` +
      `⏰ Schedule: ${message.schedule}\n` +
      `Status: ${message.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
      `───────────────────`
    ).join('\n\n');

  return bot.sendMessage(chatId,
    messageList || '📝 No recurring messages set up.');
});

// Admin command to remove recurring message
bot.onText(/\/remove_recurring_message (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const username = msg.from?.username;

  if (username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can remove recurring messages.');
  }

  const messageId = match?.[1];
  if (!messageId) {
    return bot.sendMessage(chatId, '❌ Please provide a message ID.');
  }

  if (recurringMessages.delete(messageId)) {
    return bot.sendMessage(chatId, '✅ Recurring message removed successfully!');
  } else {
    return bot.sendMessage(chatId, '❌ Message not found.');
  }
});

// Anti-spam and anti-begging handler
bot.on('message', async (msg) => {
  if (!msg.text || !msg.from || msg.chat.type === 'private') return;

  const userId = msg.from.id.toString();
  const chatId = msg.chat.id;
  const messageText = msg.text;

  // Check for spam
  if (isSpamming(userId)) {
    try {
      await bot.restrictChatMember(chatId, userId, {
        until_date: Math.floor(Date.now() / 1000) + SPAM_DETECTION.MUTE_DURATION,
        permissions: {
          can_send_messages: false,
          can_send_media_messages: false,
          can_send_other_messages: false,
          can_add_web_page_previews: false
        }
      });

      await bot.sendMessage(chatId,
        `⚠️ @${msg.from.username} has been muted for ${SPAM_DETECTION.MUTE_DURATION / 60} minutes due to spamming.`);
    } catch (error) {
      console.error('Error muting spammer:', error);
    }
    return;
  }

  // Check for begging
  if (containsBegging(messageText)) {
    try {
      await bot.deleteMessage(chatId, msg.message_id.toString());
      await bot.sendMessage(chatId,
        `⚠️ @${msg.from.username} begging is not allowed in this group.`);
    } catch (error) {
      console.error('Error handling begging message:', error);
    }
  }
});


export { bot };