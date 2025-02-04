import TelegramBot from 'node-telegram-bot-api';
import { db } from '@db';
import { telegramUsers, verificationRequests } from '@db/schema/telegram';
import { eq, desc, and } from 'drizzle-orm';
import { API_CONFIG } from '../config/api';
import { users } from '@db/schema'; // Import users schema to check usernames

const token = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_TELEGRAM_IDS = process.env.ADMIN_TELEGRAM_IDS?.split(',') || [];

if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN must be provided');
}

// Create a bot instance
const bot = new TelegramBot(token, { polling: true });

// Debug logging function
function logDebug(message: string, data?: any) {
  console.log(`[Telegram Bot] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

// Set up bot commands with proper descriptions
async function setupBotCommands() {
  try {
    // First, clear existing commands
    await bot.deleteMyCommands();

    // Set up new commands
    const commands = [
      { command: 'start', description: '🚀 Start the bot and verify your account' },
      { command: 'verify', description: '🔐 Verify your Goated account' },
      { command: 'stats', description: '📊 View your wager statistics' },
      { command: 'race', description: '🏁 Check your race position' },
      { command: 'leaderboard', description: '🏆 View the monthly race leaderboard' },
    ];

    await bot.setMyCommands(commands);

    // Log success and verify commands are set
    const currentCommands = await bot.getMyCommands();
    logDebug('Bot commands set up successfully', currentCommands);
  } catch (error) {
    logDebug('Error setting up bot commands', error);
    throw error; // Re-throw to ensure we know if setup fails
  }
}

// Initialize bot commands
setupBotCommands();


// Check if user is admin
function isAdmin(telegramId: string): boolean {
  return ADMIN_TELEGRAM_IDS.includes(telegramId);
}

// Helper function to fetch leaderboard data from our platform
async function fetchLeaderboardData() {
  try {
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
      throw new Error(`API request failed: ${response.status}`);
    }

    const rawData = await response.json();
    return rawData;
  } catch (error) {
    logDebug('Error fetching leaderboard data', error);
    throw error;
  }
}

// Helper function to transform raw data into period-specific stats
function transformLeaderboardData(data: any) {
  if (!data || !Array.isArray(data)) return null;

  return data.map(entry => ({
    username: entry.name,
    wagered: {
      today: entry.wagered?.today || 0,
      this_week: entry.wagered?.this_week || 0,
      this_month: entry.wagered?.this_month || 0,
      all_time: entry.wagered?.all_time || 0
    }
  }));
}

// Welcome message handler
async function handleStart(msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();

  if (!telegramId) {
    return bot.sendMessage(chatId, 'Could not identify user.');
  }

  // Check if user is already verified
  const existingUser = await db.select()
    .from(telegramUsers)
    .where(eq(telegramUsers.telegramId, telegramId))
    .execute();

  if (existingUser?.[0]?.isVerified) {
    const keyboard = {
      inline_keyboard: [
        [{ text: '📊 My Stats', callback_data: 'stats' }],
        [{ text: '🏁 Race Position', callback_data: 'race' }],
        [{ text: '🏆 Leaderboard', callback_data: 'leaderboard' }]
      ]
    };

    return bot.sendMessage(
      chatId,
      `Welcome back! What would you like to check?`,
      { reply_markup: keyboard }
    );
  }

  // For new users, start verification process
  const message = `👋 Welcome to the Goated Stats Bot!
To get started, I'll need to verify your Goated account. 

Please click the button below to begin verification:`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '🔐 Start Verification', callback_data: 'start_verify' }]
    ]
  };

  return bot.sendMessage(chatId, message, { reply_markup: keyboard });
}

// Handle callback queries (button clicks)
async function handleCallbackQuery(callbackQuery: TelegramBot.CallbackQuery) {
  const chatId = callbackQuery.message?.chat.id;
  const messageId = callbackQuery.message?.message_id;
  const telegramId = callbackQuery.from.id.toString();

  if (!chatId || !messageId) return;

  switch (callbackQuery.data) {
    case 'start_verify':
      await bot.editMessageText(
        'Please enter your Goated username using the command:\n/verify YourUsername',
        { chat_id: chatId, message_id: messageId }
      );
      break;

    case 'stats':
      await handleStats({ chat: { id: chatId }, from: { id: Number(telegramId) } } as TelegramBot.Message);
      break;

    case 'race':
      await handleRace({ chat: { id: chatId }, from: { id: Number(telegramId) } } as TelegramBot.Message);
      break;

    case 'leaderboard':
      await handleLeaderboard({ chat: { id: chatId } } as TelegramBot.Message);
      break;
  }

  // Answer callback query to remove loading state
  await bot.answerCallbackQuery(callbackQuery.id);
}

// Command handlers
async function handleVerify(msg: TelegramBot.Message, match: RegExpExecArray | null) {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();

  if (!telegramId) {
    return bot.sendMessage(chatId, 'Could not identify user.');
  }

  // If no username provided, ask for it
  if (!match?.[1]) {
    return bot.sendMessage(chatId, 
      'Please provide your Goated username with the command.\n' +
      'Example: /verify YourGoatedUsername');
  }

  const goatedUsername = match[1].trim();

  try {
    // First check our database for the username
    const dbUser = await db.query.users.findFirst({
      where: eq(users.username, goatedUsername)
    });

    // Then check leaderboard data as backup
    const leaderboardData = await fetchLeaderboardData();
    const transformedData = transformLeaderboardData(leaderboardData);
    const leaderboardUser = transformedData?.some(user => 
      user.username.toLowerCase() === goatedUsername.toLowerCase()
    );

    // If user exists in either source, proceed with verification
    if (dbUser || leaderboardUser) {
      // Create or update verification request
      await db.insert(verificationRequests)
        .values({
          telegramId,
          goatedUsername,
          status: 'pending',
          requestedAt: new Date()
        })
        .onConflictDoUpdate({
          target: [verificationRequests.telegramId],
          set: { goatedUsername, status: 'pending', requestedAt: new Date() }
        });

      // Create or update telegram user
      await db.insert(telegramUsers)
        .values({
          telegramId,
          goatedUsername,
          isVerified: false,
          createdAt: new Date()
        })
        .onConflictDoUpdate({
          target: [telegramUsers.telegramId],
          set: { goatedUsername }
        });

      // Notify admins about new verification request
      for (const adminId of ADMIN_TELEGRAM_IDS) {
        const keyboard = {
          inline_keyboard: [
            [
              { text: '✅ Approve', callback_data: `verify_approve_${telegramId}` },
              { text: '❌ Reject', callback_data: `verify_reject_${telegramId}` }
            ]
          ]
        };

        await bot.sendMessage(
          adminId,
          `New verification request:\nTelegram User: ${msg.from?.username || 'Unknown'}\nGoated Username: ${goatedUsername}`,
          { reply_markup: keyboard }
        );
      }

      return bot.sendMessage(
        chatId,
        'Verification request submitted!\n' +
        'An admin will review your request and verify your account.\n' +
        'You will be notified once your account is verified.'
      );
    } else {
      return bot.sendMessage(chatId, 
        'Could not find your username in our system.\n' +
        'Please ensure you provided the correct Goated username and try again.');
    }
  } catch (error) {
    logDebug('Error in handleVerify', error);
    return bot.sendMessage(chatId, 'An error occurred while processing your verification request. Please try again later.');
  }
}

// Group chat detection helper
function isGroupChat(chatId: number): boolean {
  return chatId < 0;
}

async function handleStats(msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();

  if (!telegramId) {
    return bot.sendMessage(chatId, 'Could not identify user.');
  }

  try {
    const user = await db.select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramId, telegramId))
      .execute();

    if (!user?.[0]?.isVerified || !user[0].goatedUsername) {
      return bot.sendMessage(
        chatId,
        'Please verify your account first by clicking the Start button or using /start',
        { reply_markup: { inline_keyboard: [[{ text: '🔐 Start Verification', callback_data: 'start_verify' }]] } }
      );
    }

    const leaderboardData = await fetchLeaderboardData();
    const transformedData = transformLeaderboardData(leaderboardData);
    const userStats = transformedData?.find(u => 
      u.username.toLowerCase() === user[0].goatedUsername?.toLowerCase()
    );

    if (!userStats) {
      return bot.sendMessage(chatId, 'Could not find your stats. Please try again later.');
    }

    const message = `📊 ${isGroupChat(chatId) ? `Stats for ${userStats.username}:\n` : 'Your Wager Stats:\n'}
Monthly: $${userStats.wagered.this_month.toLocaleString()}
Weekly: $${userStats.wagered.this_week.toLocaleString()}
Daily: $${userStats.wagered.today.toLocaleString()}
All-time: $${userStats.wagered.all_time.toLocaleString()}`;

    if (!isGroupChat(chatId)) {
      const keyboard = {
        inline_keyboard: [
          [{ text: '🔄 Refresh Stats', callback_data: 'stats' }],
          [{ text: '🏁 Check Race Position', callback_data: 'race' }]
        ]
      };
      return bot.sendMessage(chatId, message, { reply_markup: keyboard });
    }

    return bot.sendMessage(chatId, message);
  } catch (error) {
    logDebug('Error in handleStats', error);
    return bot.sendMessage(chatId, 'An error occurred while fetching your stats. Please try again later.');
  }
}

async function handleRace(msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();

  if (!telegramId) {
    return bot.sendMessage(chatId, 'Could not identify user.');
  }

  try {
    const user = await db.select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramId, telegramId))
      .execute();

    if (!user?.[0]?.isVerified || !user[0].goatedUsername) {
      return bot.sendMessage(
        chatId,
        'Please verify your account first by clicking the Start button or using /start',
        { reply_markup: { inline_keyboard: [[{ text: '🔐 Start Verification', callback_data: 'start_verify' }]] } }
      );
    }

    const leaderboardData = await fetchLeaderboardData();
    const transformedData = transformLeaderboardData(leaderboardData);

    if (!transformedData) {
      return bot.sendMessage(chatId, 'Could not fetch race data. Please try again later.');
    }

    // Sort by monthly wager
    const sortedData = [...transformedData].sort((a, b) => 
      b.wagered.this_month - a.wagered.this_month
    );

    const userIndex = sortedData.findIndex(u => 
      u.username.toLowerCase() === user[0].goatedUsername?.toLowerCase()
    );

    if (userIndex === -1) {
      return bot.sendMessage(chatId, 'Could not find your position in the race. Please try again later.');
    }

    const userPosition = userIndex + 1;
    const userStats = sortedData[userIndex];
    const nextPositionUser = userIndex > 0 ? sortedData[userIndex - 1] : null;

    const message = `🏁 ${isGroupChat(chatId) ? `Race position for ${userStats.username}:\n` : 'Your Race Position:\n'}
Position: #${userPosition}
Monthly Wager: $${userStats.wagered.this_month.toLocaleString()}
${nextPositionUser 
  ? `Distance to #${userPosition - 1}: $${(nextPositionUser.wagered.this_month - userStats.wagered.this_month).toLocaleString()}`
  : 'You are in the lead! 🏆'}`;

    if (!isGroupChat(chatId)) {
      const keyboard = {
        inline_keyboard: [
          [{ text: '🔄 Refresh Position', callback_data: 'race' }],
          [{ text: '🏆 View Leaderboard', callback_data: 'leaderboard' }]
        ]
      };
      return bot.sendMessage(chatId, message, { reply_markup: keyboard });
    }

    return bot.sendMessage(chatId, message);
  } catch (error) {
    logDebug('Error in handleRace', error);
    return bot.sendMessage(chatId, 'An error occurred while fetching race data. Please try again later.');
  }
}

async function handleLeaderboard(msg: TelegramBot.Message) {
  const chatId = msg.chat.id;

  try {
    const leaderboardData = await fetchLeaderboardData();
    const transformedData = transformLeaderboardData(leaderboardData);

    if (!transformedData) {
      return bot.sendMessage(chatId, 'Could not fetch leaderboard data. Please try again later.');
    }

    // Sort by monthly wager and get top 10
    const top10 = [...transformedData]
      .sort((a, b) => b.wagered.this_month - a.wagered.this_month)
      .slice(0, 10);

    const leaderboard = top10
      .map((user, index) => 
        `${index + 1}. ${user.username}: $${user.wagered.this_month.toLocaleString()}`)
      .join('\n');

    const message = `🏆 Monthly Race Leaderboard\n\n${leaderboard}`;

    if (!isGroupChat(chatId)) {
      const keyboard = {
        inline_keyboard: [
          [{ text: '🔄 Refresh Leaderboard', callback_data: 'leaderboard' }],
          [{ text: '📊 My Stats', callback_data: 'stats' }]
        ]
      };
      return bot.sendMessage(chatId, message, { reply_markup: keyboard });
    }

    return bot.sendMessage(chatId, message);
  } catch (error) {
    logDebug('Error in handleLeaderboard', error);
    return bot.sendMessage(chatId, 'An error occurred while fetching leaderboard data. Please try again later.');
  }
}

// Register event handlers
bot.onText(/\/start/, handleStart);
bot.onText(/\/verify(?:\s+(.+))?/, handleVerify);
bot.onText(/\/stats/, handleStats);
bot.onText(/\/race/, handleRace);
bot.onText(/\/leaderboard/, handleLeaderboard);
bot.on('callback_query', handleCallbackQuery);

// Initialize bot
setupBotCommands().catch(error => {
  console.error('Failed to initialize bot commands:', error);
});

// Export bot instance for use in main server
export { bot };