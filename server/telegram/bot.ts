import TelegramBot from 'node-telegram-bot-api';
import { db } from '@db';
import { telegramUsers, raceStats, bonusCodes, bonusRedemptions } from '@db/schema/telegram';
import { eq, desc } from 'drizzle-orm';
import { users } from '@db/schema/users';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN must be provided');
}

// Create a bot instance
const bot = new TelegramBot(token, { polling: true });

// Debug logging function
function logDebug(message: string, data?: any) {
  console.log(`[Telegram Bot] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

interface RaceStat {
  username: string;
  monthlyWager: number;
  weeklyWager: number;
  dailyWager: number;
  lastUpdated: Date;
}

// Command handlers
async function handleStats(msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();

  logDebug('Stats command received', { chatId, telegramId });

  if (!telegramId) {
    logDebug('Could not identify user');
    return bot.sendMessage(chatId, 'Could not identify user.');
  }

  try {
    const user = await db.select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramId, telegramId))
      .execute();

    logDebug('User query result', { user });

    if (!user?.[0]?.isVerified) {
      return bot.sendMessage(chatId, 'Please verify your account first by using /verify command.');
    }

    const stats = await db.select()
      .from(raceStats)
      .where(eq(raceStats.username, user[0].username as string))
      .execute();

    logDebug('Stats query result', { stats });

    if (!stats?.[0]) {
      return bot.sendMessage(chatId, 'No stats found for your account.');
    }

    const message = `📊 Your Wager Stats:
Monthly: $${stats[0].monthlyWager}
Weekly: $${stats[0].weeklyWager}
Daily: $${stats[0].dailyWager}
Last Updated: ${stats[0].lastUpdated.toLocaleString()}`;

    return bot.sendMessage(chatId, message);
  } catch (error) {
    logDebug('Error in handleStats', error);
    return bot.sendMessage(chatId, 'An error occurred while fetching your stats. Please try again later.');
  }
}

async function handleRace(msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();

  logDebug('Race command received', { chatId, telegramId });

  if (!telegramId) {
    return bot.sendMessage(chatId, 'Could not identify user.');
  }

  try {
    const user = await db.select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramId, telegramId))
      .execute();

    logDebug('User query result', { user });

    if (!user?.[0]?.isVerified) {
      return bot.sendMessage(chatId, 'Please verify your account first by using /verify command.');
    }

    const allStats = await db.select()
      .from(raceStats)
      .orderBy(desc(raceStats.monthlyWager))
      .execute();

    logDebug('Race stats query result', { statsCount: allStats.length });

    const userPosition = allStats.findIndex(stat => stat.username === user[0].username) + 1;
    const userStats = allStats.find(stat => stat.username === user[0].username);

    if (!userStats) {
      return bot.sendMessage(chatId, 'No race stats found for your account.');
    }

    const message = `🏁 Race Position: #${userPosition}
Monthly Wager: $${userStats.monthlyWager}
Distance to next position: ${userPosition > 1 
  ? `$${allStats[userPosition-2].monthlyWager - userStats.monthlyWager}`
  : 'You are in the lead! 🏆'}`;

    return bot.sendMessage(chatId, message);
  } catch (error) {
    logDebug('Error in handleRace', error);
    return bot.sendMessage(chatId, 'An error occurred while fetching race data. Please try again later.');
  }
}

async function handleLeaderboard(msg: TelegramBot.Message) {
  const chatId = msg.chat.id;

  logDebug('Leaderboard command received', { chatId });

  try {
    const topWagerers = await db.select()
      .from(raceStats)
      .orderBy(desc(raceStats.monthlyWager))
      .limit(10)
      .execute();

    logDebug('Leaderboard query result', { wagererCount: topWagerers.length });

    const leaderboard = topWagerers
      .map((stat, index) => `${index + 1}. ${stat.username}: $${stat.monthlyWager}`)
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

// Export bot instance for use in main server
export { bot };