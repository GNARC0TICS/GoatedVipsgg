
import TelegramBot from 'node-telegram-bot-api';
import { db } from '@db';
import { telegramUsers } from '@db/schema/telegram';
import { API_CONFIG } from '../config/api';
import { transformLeaderboardData } from '../routes';

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is required');
}

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, 'Welcome to GoatedVIPs! Use /help to see available commands.');
});

bot.onText(/\/stats(?:\s+(.+))?/, async (msg, match) => {
  try {
    const username = match?.[1]?.trim() || '';
    const response = await fetch(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}${username ? `?username=${username}` : ''}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.API_TOKEN || API_CONFIG.token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }

    const data = await response.json();
    const stats = transformLeaderboardData(data);
    const monthlyStats = stats.data.monthly.data[0] || null;

    const message = monthlyStats ? 
      `📊 Stats for ${monthlyStats.name}:\n\n` +
      `Monthly Wagered: $${monthlyStats.wagered.this_month.toFixed(2)}\n` +
      `Position: #${stats.data.monthly.data.findIndex(p => p.name === monthlyStats.name) + 1}`
      : 'No stats found for this period.';

    await bot.sendMessage(msg.chat.id, message);
  } catch (error) {
    await bot.sendMessage(msg.chat.id, 'Error fetching stats. Please try again later.');
  }
});

bot.onText(/\/race/, async (msg) => {
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
      throw new Error('Failed to fetch race data');
    }

    const data = await response.json();
    const stats = transformLeaderboardData(data);
    const top5 = stats.data.monthly.data.slice(0, 5);

    const message = '🏁 Current Race Standings:\n\n' +
      top5.map((player, index) => 
        `${index + 1}. ${player.name}: $${player.wagered.this_month.toFixed(2)}`
      ).join('\n');

    await bot.sendMessage(msg.chat.id, message);
  } catch (error) {
    await bot.sendMessage(msg.chat.id, 'Error fetching race data. Please try again later.');
  }
});

export { bot };
