import TelegramBot from 'node-telegram-bot-api';
import { db } from '@db';
import { telegramUsers, verificationRequests } from '@db/schema/telegram';
import { eq, desc, and } from 'drizzle-orm';
import { API_CONFIG } from '../config/api';

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

// Command handlers
async function handleVerify(msg: TelegramBot.Message, match: RegExpExecArray | null) {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();

  if (!telegramId) {
    return bot.sendMessage(chatId, 'Could not identify user.');
  }

  // Check if already verified
  const existingUser = await db.select()
    .from(telegramUsers)
    .where(eq(telegramUsers.telegramId, telegramId))
    .execute();

  if (existingUser?.[0]?.isVerified) {
    return bot.sendMessage(chatId, 'Your account is already verified.');
  }

  // If no username provided, ask for it
  if (!match?.[1]) {
    return bot.sendMessage(chatId, 
      'Please provide your Goated username with the command.\n' +
      'Example: /verify YourGoatedUsername');
  }

  const goatedUsername = match[1].trim();

  try {
    // Verify the username exists in leaderboard data
    const leaderboardData = await fetchLeaderboardData();
    const transformedData = transformLeaderboardData(leaderboardData);
    const userExists = transformedData?.some(user => user.username.toLowerCase() === goatedUsername.toLowerCase());

    if (!userExists) {
      return bot.sendMessage(chatId, 
        'Could not find your username in our system.\n' +
        'Please ensure you provided the correct Goated username.');
    }

    // Create or update verification request
    await db.insert(verificationRequests)
      .values({
        telegramId,
        goatedUsername,
        status: 'pending'
      })
      .onConflictDoUpdate({
        target: [verificationRequests.telegramId],
        set: { goatedUsername, status: 'pending' }
      })
      .execute();

    // Create or update telegram user
    await db.insert(telegramUsers)
      .values({
        telegramId,
        goatedUsername,
        isVerified: false
      })
      .onConflictDoUpdate({
        target: [telegramUsers.telegramId],
        set: { goatedUsername }
      })
      .execute();

    return bot.sendMessage(chatId,
      'Verification request submitted!\n' +
      'An admin will review your request and verify your account.\n' +
      'You will be notified once your account is verified.');

  } catch (error) {
    logDebug('Error in handleVerify', error);
    return bot.sendMessage(chatId, 'An error occurred while processing your verification request. Please try again later.');
  }
}

async function handleAdminVerify(msg: TelegramBot.Message, match: RegExpExecArray | null) {
  const chatId = msg.chat.id;
  const adminId = msg.from?.id.toString();

  if (!adminId || !isAdmin(adminId)) {
    return bot.sendMessage(chatId, 'This command is only available to admins.');
  }

  const args = match?.[1]?.trim().split(' ');
  if (!args || args.length < 2) {
    return bot.sendMessage(chatId,
      'Please provide telegram ID and action (approve/reject).\n' +
      'Example: /admin_verify 123456789 approve');
  }

  const [targetTelegramId, action] = args;
  const notes = args.slice(2).join(' ');

  try {
    const request = await db.select()
      .from(verificationRequests)
      .where(and(
        eq(verificationRequests.telegramId, targetTelegramId),
        eq(verificationRequests.status, 'pending')
      ))
      .execute();

    if (!request?.[0]) {
      return bot.sendMessage(chatId, 'No pending verification request found for this user.');
    }

    if (action === 'approve') {
      // Update verification request
      await db.update(verificationRequests)
        .set({ status: 'approved', adminNotes: notes })
        .where(eq(verificationRequests.telegramId, targetTelegramId))
        .execute();

      // Update user verification status
      await db.update(telegramUsers)
        .set({ isVerified: true })
        .where(eq(telegramUsers.telegramId, targetTelegramId))
        .execute();

      // Notify user
      await bot.sendMessage(targetTelegramId, 
        'Your account has been verified! You can now use all bot commands.');

      return bot.sendMessage(chatId, 'User has been verified successfully.');
    } else if (action === 'reject') {
      // Update verification request
      await db.update(verificationRequests)
        .set({ status: 'rejected', adminNotes: notes })
        .where(eq(verificationRequests.telegramId, targetTelegramId))
        .execute();

      // Notify user
      await bot.sendMessage(targetTelegramId,
        'Your verification request has been rejected.\n' +
        'Please ensure you provided the correct Goated username and try again.');

      return bot.sendMessage(chatId, 'Verification request has been rejected.');
    }

    return bot.sendMessage(chatId, 'Invalid action. Use "approve" or "reject".');

  } catch (error) {
    logDebug('Error in handleAdminVerify', error);
    return bot.sendMessage(chatId, 'An error occurred while processing the verification request.');
  }
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
      return bot.sendMessage(chatId, 'Please verify your account first by using /verify command.');
    }

    const leaderboardData = await fetchLeaderboardData();
    const transformedData = transformLeaderboardData(leaderboardData);
    const userStats = transformedData?.find(u => 
      u.username.toLowerCase() === user[0].goatedUsername?.toLowerCase()
    );

    if (!userStats) {
      return bot.sendMessage(chatId, 'Could not find your stats. Please try again later.');
    }

    const message = `📊 Your Wager Stats:
Monthly: $${userStats.wagered.this_month.toLocaleString()}
Weekly: $${userStats.wagered.this_week.toLocaleString()}
Daily: $${userStats.wagered.today.toLocaleString()}
All-time: $${userStats.wagered.all_time.toLocaleString()}`;

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
      return bot.sendMessage(chatId, 'Please verify your account first by using /verify command.');
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

    const message = `🏁 Race Position: #${userPosition}
Monthly Wager: $${userStats.wagered.this_month.toLocaleString()}
${nextPositionUser 
  ? `Distance to #${userPosition - 1}: $${(nextPositionUser.wagered.this_month - userStats.wagered.this_month).toLocaleString()}`
  : 'You are in the lead! 🏆'}`;

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
    return bot.sendMessage(chatId, message);
  } catch (error) {
    logDebug('Error in handleLeaderboard', error);
    return bot.sendMessage(chatId, 'An error occurred while fetching leaderboard data. Please try again later.');
  }
}

// Register command handlers
bot.onText(/\/stats/, handleStats);
bot.onText(/\/race/, handleRace);
bot.onText(/\/leaderboard/, handleLeaderboard);
bot.onText(/\/verify(?:\s+(.+))?/, handleVerify);
bot.onText(/\/admin_verify\s+(.+)/, handleAdminVerify);

// Export bot instance for use in main server
export { bot };