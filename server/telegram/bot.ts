import TelegramBot from 'node-telegram-bot-api';
import { db } from '@db';
import { telegramUsers, verificationRequests } from '@db/schema/telegram';
import { eq, desc, and } from 'drizzle-orm';

const token = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_TELEGRAM_IDS = process.env.ADMIN_TELEGRAM_IDS?.split(',') || [];
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.goated.com';

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

// Helper function to fetch user stats from platform API
async function fetchUserStats(username: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/affiliate/stats?username=${username}`);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    logDebug('Error fetching user stats', error);
    throw error;
  }
}

// Helper function to fetch current race standings
async function fetchRaceStandings(username: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/affiliate/race?username=${username}`);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    logDebug('Error fetching race standings', error);
    throw error;
  }
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

    const stats = await fetchUserStats(user[0].goatedUsername);

    const message = `📊 Your Wager Stats:
Monthly: $${stats.monthlyWager}
Weekly: $${stats.weeklyWager}
Daily: $${stats.dailyWager}
Last Updated: ${new Date(stats.lastUpdated).toLocaleString()}`;

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

    const raceData = await fetchRaceStandings(user[0].goatedUsername);
    const { position, monthlyWager, nextPosition, nextPositionWager } = raceData;

    const message = `🏁 Race Position: #${position}
Monthly Wager: $${monthlyWager}
${nextPosition 
  ? `Distance to #${nextPosition}: $${nextPositionWager - monthlyWager}`
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
    const raceData = await fetchRaceStandings('');  // Empty username to get full leaderboard
    const leaderboard = raceData.topWagerers
      .map((user: any, index: number) => 
        `${index + 1}. ${user.username}: $${user.monthlyWager}`)
      .join('\n');

    const message = `🏆 Monthly Race Leaderboard\n\n${leaderboard}`;
    return bot.sendMessage(chatId, message);
  } catch (error) {
    logDebug('Error in handleLeaderboard', error);
    return bot.sendMessage(chatId, 'An error occurred while fetching leaderboard data. Please try again later.');
  }
}

// Log when bot starts
logDebug('Bot initialized and starting polling');

// Register command handlers
bot.onText(/\/stats/, handleStats);
bot.onText(/\/race/, handleRace);
bot.onText(/\/leaderboard/, handleLeaderboard);
bot.onText(/\/verify(?:\s+(.+))?/, handleVerify);
bot.onText(/\/admin_verify\s+(.+)/, handleAdminVerify);

// Export bot instance for use in main server
export { bot };