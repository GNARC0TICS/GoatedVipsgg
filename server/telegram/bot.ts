import TelegramBot from 'node-telegram-bot-api';
import { db } from '@db';
import { telegramUsers, verificationRequests } from '@db/schema/telegram';
import { API_CONFIG } from '../config/api';
import { transformLeaderboardData } from '../routes';
import { eq } from 'drizzle-orm';

// Add rate limiting for message sending
const messageRateLimiter = new Map<number, number>();
const RATE_LIMIT_WINDOW = 1000; // 1 second
const MAX_MESSAGES_PER_WINDOW = 3;

// Enhanced safeSendMessage with rate limiting
const safeSendMessage = async (chatId: number, text: string, options = {}) => {
  try {
    // Check rate limit
    const now = Date.now();
    const lastMessageTime = messageRateLimiter.get(chatId) || 0;

    if (now - lastMessageTime < RATE_LIMIT_WINDOW) {
      console.log('Rate limiting applied for chat:', chatId);
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_WINDOW));
    }

    messageRateLimiter.set(chatId, now);

    console.log('Attempting to send message to chat:', {
      chatId,
      timestamp: new Date().toISOString(),
      messagePreview: text.slice(0, 50)
    });

    return await bot.sendMessage(chatId, text, {
      ...options,
      disable_web_page_preview: true
    });
  } catch (error: any) {
    console.error('Error sending message:', {
      chatId,
      text: text.slice(0, 100) + '...',
      error: error.message,
      timestamp: new Date().toISOString()
    });

    // If the original message fails, try sending a simplified version
    try {
      const simplifiedText = text.replace(/[<>]/g, '').trim();
      return await bot.sendMessage(chatId, simplifiedText, {
        ...options,
        parse_mode: undefined,
        disable_web_page_preview: true
      });
    } catch (secondError: any) {
      console.error('Failed to send even simplified message:', {
        error: secondError.message,
        timestamp: new Date().toISOString()
      });
      throw secondError;
    }
  }
};

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is required');
}

// Create bot instance with proper error handling
let bot: TelegramBot;

try {
  console.log('Initializing Telegram bot...');

  bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
    polling: {
      interval: 300,
      autoStart: true,
      params: {
        timeout: 10
      }
    },
    filepath: false
  });

  // Add error handlers with detailed logging
  bot.on('polling_error', (error: any) => {
    console.error('Telegram polling error:', {
      message: error.message,
      code: error?.code,
      response: error?.response?.body,
      timestamp: new Date().toISOString()
    });
  });

  bot.on('error', (error: Error) => {
    console.error('Telegram bot error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  });

  // Enhanced message logging
  bot.on('message', (msg) => {
    console.log('Received message:', {
      chatId: msg.chat.id,
      text: msg.text,
      from: msg.from?.username,
      timestamp: new Date().toISOString(),
      type: msg.entities?.[0]?.type,
      messageId: msg.message_id
    });
  });

  // Initialize commands with error handling
  const setupCommands = async () => {
    try {
      console.log('Setting up bot commands...');
      await bot.deleteMyCommands(); // Clear existing commands

      const commands = [
        { command: 'start', description: '🚀 Start using the bot' },
        { command: 'verify', description: '🔐 Link your Goated account' },
        { command: 'stats', description: '📊 Check your wager stats' },
        { command: 'race', description: '🏁 View your race position' },
        { command: 'leaderboard', description: '🏆 See top players' },
        { command: 'play', description: '🎮 Play on Goated with our affiliate link' },
        { command: 'website', description: '🌐 Visit GoatedVIPs.gg' },
        { command: 'help', description: '❓ Get help using the bot' }
      ];

      await bot.setMyCommands(commands);
      console.log('Bot commands initialized successfully');
    } catch (error) {
      console.error('Error setting up bot commands:', error);
      throw error; // Rethrow to handle in initializeBot
    }
  };

  // Initialize bot and verify connection
  const initializeBot = async () => {
    try {
      // Test bot connection
      const botInfo = await bot.getMe();
      console.log('Bot connected successfully:', botInfo);

      // Setup commands after confirming connection
      await setupCommands();
    } catch (error) {
      console.error('Bot initialization error:', error);
      throw error;
    }
  };

  // Run initialization
  initializeBot().catch((error) => {
    console.error('Failed to initialize bot:', error);
    process.exit(1);
  });

} catch (error) {
  console.error('Failed to create bot instance:', error);
  throw error;
}

// Admin check utility
const isAdmin = async (chatId: number): Promise<boolean> => {
  return chatId.toString() === "1689953605";
};


// Command handlers
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  console.log('Received /start command from:', {
    chatId,
    username: msg.from?.username,
    timestamp: new Date().toISOString()
  });

  try {
    await safeSendMessage(
      chatId,
      '🎮 Welcome to GoatedVIPs Affiliate Bot!\n\n' +
      'Use /verify to link your platform account\n' +
      'Use /help to see all available commands'
    );
    console.log('Start command successfully processed for chat:', chatId);
  } catch (error) {
    console.error('Start command error:', error);
  }
});

bot.onText(/\/play/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    await safeSendMessage(
      chatId,
      '🎮 Ready to play?\n\n' +
      'Join Goated using our affiliate link:\n' +
      'https://goatedvips.gg/?ref=telegram\n\n' +
      'Use /verify after signing up to link your account!'
    );
    console.log(`Play command processed for chat ${chatId}`);
  } catch (error) {
    console.error('Play command error:', error);
    await safeSendMessage(chatId, '❌ Error processing command. Please try again later.');
  }
});

bot.onText(/\/website/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    await safeSendMessage(
      chatId,
      '🌐 Visit our website:\n' +
      'https://goatedvips.gg\n\n' +
      'Join the community and start earning rewards!'
    );
    console.log(`Website command processed for chat ${chatId}`);
  } catch (error) {
    console.error('Website command error:', error);
    await safeSendMessage(chatId, '❌ Error processing command. Please try again later.');
  }
});

bot.onText(/\/leaderboard/, async (msg) => {
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

    if (!response.ok) throw new Error('Failed to fetch leaderboard data');

    const data = await response.json();
    const stats = transformLeaderboardData(data);
    const top10 = stats.data.monthly.data.slice(0, 10);

    const message =
      '🏆 Monthly Leaderboard Top 10:\n\n' +
      top10.map((player, index) =>
        `${index + 1}. ${player.name}\n` +
        `   💰 $${player.wagered.this_month.toFixed(2)}`
      ).join('\n\n');

    await safeSendMessage(chatId, message);
    console.log(`Leaderboard command processed for chat ${chatId}`);
  } catch (error) {
    console.error('Leaderboard error:', error);
    await safeSendMessage(chatId, '❌ Error fetching leaderboard data. Please try again later.');
  }
});

bot.onText(/\/verify (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const username = match?.[1]?.trim();

  if (!username) {
    await safeSendMessage(chatId, 'Usage: /verify your_platform_username');
    return;
  }

  try {
    console.log(`Processing verification for ${username} in chat ${chatId}`);

    // Check if already verified
    const existingUser = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramId, chatId.toString()))
      .limit(1);

    if (existingUser.length > 0 && existingUser[0].isVerified) {
      await safeSendMessage(chatId, '❌ This Telegram account is already verified');
      return;
    }

    // Create verification request
    await db.insert(verificationRequests).values({
      telegramId: chatId.toString(),
      goatedUsername: username,
      telegramUsername: msg.from?.username || '',
      status: 'pending'
    });

    await safeSendMessage(
      chatId,
      '✅ Verification request submitted!\n' +
      'An admin will review your request shortly.'
    );

    // Notify admin with proper message formatting
    const adminMessage =
      `🔔 New verification request:\n` +
      `Username: ${username}\n` +
      `Telegram: @${msg.from?.username}\n\n` +
      `Use /approve ${chatId} or /deny ${chatId} to process`;

    await safeSendMessage(Number("1689953605"), adminMessage);
    console.log('Verification request processed successfully');
  } catch (error) {
    console.error('Verification error:', error);
    await safeSendMessage(chatId, '❌ Error processing verification. Please try again later.');
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
      await safeSendMessage(adminId, '❌ Verification request not found');
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

      await safeSendMessage(Number(targetId),
        '✅ Your account has been verified!\n' +
        'You now have access to all bot features.'
      );
    } else {
      await safeSendMessage(Number(targetId),
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

    await safeSendMessage(adminId, `✅ Successfully ${action}d user`);
    console.log(`Admin ${action} command processed for user ${targetId}`);
  } catch (error) {
    console.error(`${action} error:`, error);
    await safeSendMessage(adminId, '❌ Error processing request');
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
        await safeSendMessage(chatId, '❌ Please verify your account first using /verify');
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
      await safeSendMessage(chatId, '❌ No stats found for this period');
      return;
    }

    const message =
      `📊 Stats for ${monthlyStats.name}:\n\n` +
      `Monthly Wagered: $${monthlyStats.wagered.this_month.toFixed(2)}\n` +
      `Weekly Wagered: $${monthlyStats.wagered.this_week.toFixed(2)}\n` +
      `Today's Wagered: $${monthlyStats.wagered.today.toFixed(2)}\n` +
      `Position: #${stats.data.monthly.data.findIndex(p => p.name === monthlyStats.name) + 1}`;

    await safeSendMessage(chatId, message);
    console.log(`Stats command processed for chat ${chatId}, username: ${username}`);
  } catch (error) {
    console.error('Stats error:', error);
    await safeSendMessage(chatId, '❌ Error fetching stats. Please try again later.');
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

    await safeSendMessage(chatId, message);
    console.log(`Race command processed for chat ${chatId}`);
  } catch (error) {
    console.error('Race error:', error);
    await safeSendMessage(chatId, '❌ Error fetching race data. Please try again later.');
  }
});

// Help command
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const isAdminUser = await isAdmin(chatId);

    let commands = [
      '📱 Available Commands:\n',
      '• /start - Initialize bot interaction',
      '• /verify username - Link your platform account',
      '• /stats [username] - View affiliate stats',
      '• /race - View current race standings',
      '• /help - Show this help message',
      '• /play - Play on Goated with our affiliate link',
      '• /website - Visit GoatedVIPs.gg',
      '• /leaderboard - See top players'
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

    await safeSendMessage(chatId, commands.join('\n'));
    console.log(`Help command processed for chat ${chatId}`);
  } catch (error) {
    console.error('Help command error:', error);
    await safeSendMessage(chatId, '❌ Error displaying help. Please try again later.');
  }
});

export { bot };