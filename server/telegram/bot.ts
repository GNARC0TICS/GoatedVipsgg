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
    logDebug('Attempting to fetch leaderboard data');

    // Make request to our internal API endpoint
    const response = await fetch(
      `http://0.0.0.0:5000/api/wager-races/current`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logDebug('API request failed', { status: response.status, error: errorText });
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    logDebug('Successfully fetched leaderboard data', { participantsCount: data?.length });
    return data;
  } catch (error) {
    logDebug('Error fetching leaderboard data', error);
    throw error;
  }
}

// Helper function to transform raw data into period-specific stats
function transformLeaderboardData(data: any) {
  logDebug('Transforming leaderboard data', { rawData: data });

  if (!data?.data?.participants || !Array.isArray(data.data.participants)) {
    logDebug('Invalid leaderboard data format', { data });
    return null;
  }

  return data.data.participants.map(entry => ({
    username: entry.name,
    uid: entry.uid,
    wagered: {
      today: 0, // These values aren't provided in current race data
      this_week: 0,
      this_month: entry.wagered || 0,
      all_time: entry.allTimeWagered || 0
    }
  }));
}

// Add prize pool constants to match web interface
const PRIZE_POOL = 500;
const PRIZE_DISTRIBUTION: Record<number, number> = {
  1: 0.425, // $212.50
  2: 0.2,   // $100
  3: 0.15,  // $60
  4: 0.075, // $30
  5: 0.06,  // $24
  6: 0.04,  // $16
  7: 0.0275, // $11
  8: 0.0225, // $9
  9: 0.0175, // $7
  10: 0.0175, // $7
};

// Helper function to get prize amount
function getPrizeAmount(rank: number): number {
  return Math.round(PRIZE_POOL * (PRIZE_DISTRIBUTION[rank] || 0) * 100) / 100;
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
        'Please enter your Goated username and UID using the command:\n/verify YourUsername YourUID',
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

  // If no username and UID provided, ask for them
  if (!match?.[1]) {
    return bot.sendMessage(chatId,
      'Please provide your Goated username and UID with the command.\n' +
      'Example: /verify YourUsername YourUID\n\n' +
      'You can find your UID in the monthly race leaderboard.');
  }

  const args = match[1].trim().split(/\s+/);
  if (args.length < 2) {
    return bot.sendMessage(chatId,
      'Please provide both your username and UID.\n' +
      'Example: /verify YourUsername YourUID');
  }

  const [goatedUsername, providedUid] = args;

  try {
    // Fetch leaderboard data to verify UID
    const leaderboardData = await fetchLeaderboardData();
    const transformedData = transformLeaderboardData(leaderboardData);

    // Check if user exists and UID matches
    const leaderboardUser = transformedData?.find(user =>
      user.username.toLowerCase() === goatedUsername.toLowerCase() &&
      user.uid === providedUid
    );

    if (leaderboardUser) {
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
          `New verification request:\nTelegram User: ${msg.from?.username || 'Unknown'}\nGoated Username: ${goatedUsername}\nUID: ${providedUid}`,
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
        'Could not verify your username and UID combination.\n' +
        'Please ensure both are correct and try again.\n\n' +
        'You can find your UID in the monthly race leaderboard using /leaderboard');
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

    if (!leaderboardData) {
      return bot.sendMessage(chatId, 'The leaderboard is currently unavailable. Please try again in a few minutes.');
    }

    const transformedData = transformLeaderboardData(leaderboardData);

    if (!transformedData || transformedData.length === 0) {
      return bot.sendMessage(chatId, 'No race data available at the moment. Please try again later.');
    }

    // Sort by monthly wager and get top 10
    const top10 = [...transformedData]
      .sort((a, b) => b.wagered.this_month - a.wagered.this_month)
      .slice(0, 10);

    const leaderboard = top10
      .map((user, index) => {
        const position = index + 1;
        const prize = getPrizeAmount(position);
        return `${position}. ${user.username}\n   💰 $${user.wagered.this_month.toLocaleString()}\n   🏆 Prize: $${prize}`;
      })
      .join('\n\n');

    const message = `🏆 Monthly Race Leaderboard\n` +
      `💵 Prize Pool: $${PRIZE_POOL}\n` +
      `🏁 Top 10 Racers:\n\n${leaderboard}`;

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
    return bot.sendMessage(chatId, 'An error occurred while fetching leaderboard data. Please try again in a few minutes.');
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