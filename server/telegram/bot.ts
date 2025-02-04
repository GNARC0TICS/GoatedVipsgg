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

  if (!telegramId) {
    return bot.sendMessage(chatId, 'Could not identify user.');
  }

  // Query using the proper Drizzle syntax
  const user = await db.select()
    .from(telegramUsers)
    .where(eq(telegramUsers.telegramId, telegramId))
    .execute();

  if (!user?.[0]?.isVerified) {
    return bot.sendMessage(chatId, 'Please verify your account first by using /verify command.');
  }

  const stats = await db.select()
    .from(raceStats)
    .where(eq(raceStats.username, user[0].username as string))
    .execute();

  if (!stats?.[0]) {
    return bot.sendMessage(chatId, 'No stats found for your account.');
  }

  const message = `📊 Your Wager Stats:
Monthly: $${stats[0].monthlyWager}
Weekly: $${stats[0].weeklyWager}
Daily: $${stats[0].dailyWager}
Last Updated: ${stats[0].lastUpdated.toLocaleString()}`;

  return bot.sendMessage(chatId, message);
}

async function handleRace(msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();

  if (!telegramId) {
    return bot.sendMessage(chatId, 'Could not identify user.');
  }

  const user = await db.select()
    .from(telegramUsers)
    .where(eq(telegramUsers.telegramId, telegramId))
    .execute();

  if (!user?.[0]?.isVerified) {
    return bot.sendMessage(chatId, 'Please verify your account first by using /verify command.');
  }

  const allStats = await db.select()
    .from(raceStats)
    .orderBy(desc(raceStats.monthlyWager))
    .execute();

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
}

async function handleLeaderboard(msg: TelegramBot.Message) {
  const chatId = msg.chat.id;

  const topWagerers = await db.select()
    .from(raceStats)
    .orderBy(desc(raceStats.monthlyWager))
    .limit(10)
    .execute();

  const leaderboard = topWagerers
    .map((stat, index) => `${index + 1}. ${stat.username}: $${stat.monthlyWager}`)
    .join('\n');

  const message = `🏆 Monthly Race Leaderboard\n\n${leaderboard}`;
  return bot.sendMessage(chatId, message);
}

// Register command handlers
bot.onText(/\/stats/, handleStats);
bot.onText(/\/race/, handleRace);
bot.onText(/\/leaderboard/, handleLeaderboard);

// Export bot instance for use in main server
export { bot };