
import TelegramBot from 'node-telegram-bot-api';
import { db } from '@db';
import { telegramUsers } from '@db/schema/telegram';
import { API_CONFIG } from '../config/api';
import { transformLeaderboardData } from '../routes';

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is required');
}

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Check if user is admin
const isAdmin = async (chatId: number) => {
  const [user] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId.toString()))
    .limit(1);
  return user?.chatId === "1689953605"; // Goombas's ID
};

// Public commands
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, 'Welcome to GoatedVIPs! Use /help to see available commands.');
});

bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const isAdminUser = await isAdmin(chatId);
  
  let commands = [
    '/start - Start the bot',
    '/help - Show available commands',
    '/stats [username] - View stats for a user',
    '/race - View current race standings'
  ];
  
  if (isAdminUser) {
    commands = commands.concat([
      '',
      'Admin Commands:',
      '/broadcast - Send message to all users',
      '/manage_users - Manage user access',
      '/view_logs - View bot activity logs'
    ]);
  }
  
  await bot.sendMessage(chatId, commands.join('\n'));
});

// Admin commands - only accessible to admin
bot.onText(/\/(broadcast|manage_users|view_logs)/, async (msg) => {
  const chatId = msg.chat.id;
  if (!await isAdmin(chatId)) {
    await bot.sendMessage(chatId, 'This command is only available to administrators.');
    return;
  }
  
  // Process admin commands here
  switch (msg.text?.split(' ')[0]) {
    case '/broadcast':
      // Admin broadcast logic
      break;
    case '/manage_users':
      // User management logic
      break;
    case '/view_logs':
      // Log viewing logic
      break;
  }
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
