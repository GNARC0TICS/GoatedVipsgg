
import TelegramBot from 'node-telegram-bot-api';
import { db } from '@db';
import { telegramUsers, verificationRequests } from '@db/schema/telegram';
import { API_CONFIG } from '../config/api';
import { transformLeaderboardData } from '../routes';
import { eq } from 'drizzle-orm';

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is required');
}

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  polling: true,
});

// Base command setup
bot.setMyCommands([
  { command: '/start', description: 'Start bot interaction' },
  { command: '/help', description: 'Show available commands' },
  { command: '/verify', description: 'Link your Telegram to platform account' },
  { command: '/stats', description: 'View your affiliate stats' },
  { command: '/race', description: 'View current wager race standings' }
]).catch(console.error);

// Admin check utility
const isAdmin = async (chatId: number) => {
  return chatId.toString() === "1689953605"; // Your ID
};

// Command handlers
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, 
    '🎮 Welcome to GoatedVIPs Affiliate Bot!\n\n' +
    'Use /verify to link your platform account\n' +
    'Use /help to see all available commands'
  );
});

bot.onText(/\/verify (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const username = match?.[1];
  
  if (!username) {
    await bot.sendMessage(chatId, 'Usage: /verify your_platform_username');
    return;
  }

  try {
    // Check if already verified
    const existingUser = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramId, chatId.toString()))
      .limit(1);

    if (existingUser.length > 0 && existingUser[0].isVerified) {
      await bot.sendMessage(chatId, '❌ This Telegram account is already verified');
      return;
    }

    // Create verification request
    await db.insert(verificationRequests).values({
      telegramId: chatId.toString(),
      goatedUsername: username,
      telegramUsername: msg.from?.username || '',
      status: 'pending'
    });

    await bot.sendMessage(chatId, 
      '✅ Verification request submitted!\n' +
      'An admin will review your request shortly.'
    );

    // Notify admin
    await bot.sendMessage("1689953605",
      `🔔 New verification request:\n` +
      `Username: ${username}\n` +
      `Telegram: @${msg.from?.username}\n\n` +
      `Use /approve ${chatId} or /deny ${chatId} to process`
    );
  } catch (error) {
    console.error('Verification error:', error);
    await bot.sendMessage(chatId, '❌ Error processing verification. Please try again later.');
  }
});

// Admin commands
bot.onText(/\/(approve|deny) (.+)/, async (msg, match) => {
  const adminId = msg.chat.id;
  if (!await isAdmin(adminId)) return;

  const action = match?.[1];
  const targetId = match?.[2];

  try {
    const request = await db
      .select()
      .from(verificationRequests)
      .where(eq(verificationRequests.telegramId, targetId))
      .limit(1);

    if (!request.length) {
      await bot.sendMessage(adminId, '❌ Verification request not found');
      return;
    }

    if (action === 'approve') {
      await db.insert(telegramUsers).values({
        telegramId: targetId,
        goatedUsername: request[0].goatedUsername,
        telegramUsername: request[0].telegramUsername,
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: msg.from?.username
      });

      await bot.sendMessage(targetId, 
        '✅ Your account has been verified!\n' +
        'You now have access to all bot features.'
      );
    } else {
      await bot.sendMessage(targetId,
        '❌ Your verification request was denied.\n' +
        'Please ensure you provided the correct username.'
      );
    }

    // Update request status
    await db
      .update(verificationRequests)
      .set({ 
        status: action === 'approve' ? 'approved' : 'denied',
        verifiedAt: new Date(),
        verifiedBy: msg.from?.username
      })
      .where(eq(verificationRequests.telegramId, targetId));

    await bot.sendMessage(adminId, `✅ Successfully ${action}d user`);
  } catch (error) {
    console.error(`${action} error:`, error);
    await bot.sendMessage(adminId, '❌ Error processing request');
  }
});

// Stats command
bot.onText(/\/stats(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  
  try {
    // Check if user is verified unless admin
    if (!await isAdmin(chatId)) {
      const [user] = await db
        .select()
        .from(telegramUsers)
        .where(eq(telegramUsers.telegramId, chatId.toString()))
        .limit(1);

      if (!user?.isVerified) {
        await bot.sendMessage(chatId, '❌ Please verify your account first using /verify');
        return;
      }
    }

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

    if (!response.ok) throw new Error('Failed to fetch stats');

    const data = await response.json();
    const stats = transformLeaderboardData(data);
    const monthlyStats = stats.data.monthly.data[0];

    if (!monthlyStats) {
      await bot.sendMessage(chatId, '❌ No stats found for this period');
      return;
    }

    const message = 
      `📊 Stats for ${monthlyStats.name}:\n\n` +
      `Monthly Wagered: $${monthlyStats.wagered.this_month.toFixed(2)}\n` +
      `Weekly Wagered: $${monthlyStats.wagered.this_week.toFixed(2)}\n` +
      `Today's Wagered: $${monthlyStats.wagered.today.toFixed(2)}\n` +
      `Position: #${stats.data.monthly.data.findIndex(p => p.name === monthlyStats.name) + 1}`;

    await bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Stats error:', error);
    await bot.sendMessage(chatId, '❌ Error fetching stats. Please try again later.');
  }
});

// Race command
bot.onText(/\/race/, async (msg) => {
  const chatId = msg.chat.id;
  
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

    if (!response.ok) throw new Error('Failed to fetch race data');

    const data = await response.json();
    const stats = transformLeaderboardData(data);
    const top5 = stats.data.monthly.data.slice(0, 5);

    const message = 
      '🏁 Current Race Standings:\n\n' +
      top5.map((player, index) => 
        `${index + 1}. ${player.name}\n` +
        `   💰 $${player.wagered.this_month.toFixed(2)}`
      ).join('\n\n');

    await bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Race error:', error);
    await bot.sendMessage(chatId, '❌ Error fetching race data. Please try again later.');
  }
});

// Help command
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const isAdminUser = await isAdmin(chatId);
  
  let commands = [
    '📱 Available Commands:\n',
    '• /start - Initialize bot interaction',
    '• /verify username - Link your platform account',
    '• /stats [username] - View affiliate stats',
    '• /race - View current race standings',
    '• /help - Show this help message'
  ];
  
  if (isAdminUser) {
    commands = commands.concat([
      '\n👑 Admin Commands:',
      '• /approve chatId - Approve verification',
      '• /deny chatId - Deny verification',
      '• /broadcast message - Send to all users',
      '• /stats username - View any user stats'
    ]);
  }
  
  await bot.sendMessage(chatId, commands.join('\n'));
});

export { bot };
