import TelegramBot from 'node-telegram-bot-api';
import { db } from '@db';
import { telegramUsers, verificationRequests, bonusCodes } from '@db/schema/telegram';
import { eq, and, sql } from 'drizzle-orm';
import { API_CONFIG } from '../config/api';
import { users, challenges, challengeEntries } from '@db/schema';

const token = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_TELEGRAM_IDS = ['1689953605'];
const ALLOWED_GROUP_IDS = ['-1002169964764'];

// State management for bonus code creation
const bonusCodeState = new Map();

if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN must be provided');
}

// Create a bot instance with polling and privacy mode
const bot = new TelegramBot(token, {
  polling: false,
  filepath: false // Disable file downloads for security
});

// Cleanup function to stop polling
async function stopBot() {
  try {
    await bot.stopPolling();
    console.log('[Telegram Bot] Polling stopped');
  } catch (error) {
    console.error('[Telegram Bot] Error stopping polling:', error);
  }
}

// Handle cleanup on server shutdown
process.on('SIGINT', stopBot);
process.on('SIGTERM', stopBot);

// Start polling in all environments
bot.startPolling();
console.log('[Telegram Bot] Polling started');

// Debug logging function
function logDebug(message: string, data?: any) {
  console.log(`[Telegram Bot] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

// Set up bot commands with proper descriptions
async function setupBotCommands() {
  try {
    // Clear existing commands
    await bot.deleteMyCommands();

    const baseCommands = [
      { command: 'start', description: '🚀 Start using the bot' },
      { command: 'verify', description: '🔐 Link your Goated account' },
      { command: 'stats', description: '📊 Check your wager stats' },
      { command: 'race', description: '🏁 View your race position' },
      { command: 'leaderboard', description: '🏆 See top players' },
      { command: 'play', description: '🎮 Play on Goated with our affiliate link' },
      { command: 'website', description: '🌐 Visit GoatedVIPs.gg' },
      { command: 'help', description: '❓ Get help using the bot' }
    ];

    // Add admin commands for xGoombas
    const adminCommands = [
      ...baseCommands,
      { command: 'pending', description: '📝 View pending verifications' },
      { command: 'verify_user', description: '✅ Verify a user' },
      { command: 'reject_user', description: '❌ Reject a user' },
      { command: 'makeadmin', description: '👑 Grant admin privileges' },
      { command: 'setup_guide', description: '📋 Show forwarding setup guide' },
      { command: 'setup_forwarding', description: '🔄 Start channel forwarding' },
      { command: 'list_forwardings', description: '📊 Show active forwardings' },
      { command: 'stop_forwarding', description: '⏹️ Stop all forwardings' },
      // Bonus code commands
      { command: 'createbonus', description: '🎁 Create a new bonus code' },
      { command: 'deploybonus', description: '📢 Deploy a bonus code' },
      { command: 'listbonuses', description: '📋 List active bonus codes' },
      // Challenge commands
      { command: 'createchallenge', description: '🎮 Create a new challenge' },
      { command: 'challenges', description: '🏆 View active challenges' },
      { command: 'pendingchallenges', description: '📝 View pending challenge entries' },
      { command: 'verifychallenge', description: '✅ Verify a challenge entry' },
      { command: 'rejectchallenge', description: '❌ Reject a challenge entry' }
    ];

    // Set base commands globally
    await bot.setMyCommands(baseCommands);

    // Set admin commands for specific admin users
    for (const adminId of ADMIN_TELEGRAM_IDS) {
      try {
        await bot.setMyCommands(adminCommands, {
          scope: {
            type: 'chat',
            chat_id: adminId.toString()
          }
        });
        console.log(`[Telegram Bot] Admin commands set for ${adminId}`);
      } catch (error) {
        console.error(`Error setting admin commands for ${adminId}:`, error);
      }
    }

    logDebug('Bot commands set up successfully');
  } catch (error) {
    logDebug('Error setting up bot commands', error);
    throw error;
  }
}

// Initialize bot commands with retry
async function initializeBotWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await setupBotCommands();
      console.log('[Telegram Bot] Commands initialized successfully');
      return;
    } catch (error) {
      console.error(`Failed to initialize bot (attempt ${i + 1}/${maxRetries}):`, error);
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
    }
  }
}

initializeBotWithRetry().catch(error => {
  console.error('Failed to initialize bot after all retries:', error);
});

// Add help command handler
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;

  let message = `🐐 *Welcome to Goated Stats Bot!*\n\n`;

  if (msg.from?.username === 'xGoombas') {
    message += `*Admin Commands:*\n`;
    message += `• /broadcast - Send message to all users\n`;
    message += `• /group_message - Send message to group\n`;
    message += `• /user_info - Get user information\n`;
    message += `• /pending - View verification requests\n`;
    message += `• /verify_user - Verify a user\n`;
    message += `• /reject_user - Reject a verification\n`;
    message += `• /setup_guide - Show forwarding setup guide\n`;
    message += `• /setup_forwarding - Start channel forwarding\n`;
    message += `• /list_forwardings - Show active forwardings\n`;
    message += `• /stop_forwarding - Stop all forwardings\n\n`;
  }

  message += `*Available Commands:*\n`;
  message += `• /start - Get started with the bot\n`;
  message += `• /verify - Link your Goated account\n`;
  message += `• /stats - View your wager statistics\n`;
  message += `• /check_stats - Check stats for username\n`;
  message += `• /race - Check your race position\n`;
  message += `• /leaderboard - See top players\n`;
  message += `• /play - Play on Goated with our link\n`;
  message += `• /website - Visit GoatedVIPs.gg\n\n`;
  message += `Need help? Contact @xGoombas for support.`;

  await bot.sendMessage(chatId, message, {
    parse_mode: 'MarkdownV2'
  });
});

// Command: /check_stats <username>
// Purpose: Allow users to check wager statistics for themselves or (for admins) any user
// Data Flow: Telegram -> Database -> Goated API -> Formatted Response
bot.onText(/\/check_stats (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();
  const username = match?.[1]?.trim();

  // Basic validation
  if (!telegramId) {
    return bot.sendMessage(chatId, 'Could not identify user.');
  }

  try {
    // AUTHORIZATION CHECK
    // Only xGoombas (admin) can check other users' stats
    // Regular users can only check their own stats after verification
    if (msg.from?.username !== 'xGoombas') {
      // Get requester's verification status from database
      const requester = await db.select()
        .from(telegramUsers)
        .where(eq(telegramUsers.telegramId, telegramId))
        .execute();

      // Verify user is checking their own stats and is verified
      if (!requester?.[0]?.isVerified ||
        requester[0].goatedUsername?.toLowerCase() !== username.toLowerCase()) {
        return bot.sendMessage(chatId,
          'You can only check your own stats after verification.');
      }
    }

    // DATA FETCHING
    // 1. Connect to Goated's internal API endpoint for affiliate statistics
    // This endpoint provides real-time wager data for all affiliates
    const response = await fetch(
      `http://0.0.0.0:5000/api/affiliate/stats?username=${encodeURIComponent(username)}`,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      }
    );

    // 2. Parse and transform the API response
    const data = await response.json();
    // Monthly data contains the primary stats we display
    const transformedData = data?.data?.monthly?.data;
    // Find the specific user in the data array
    let userStats = transformedData?.find(u =>
      u.name.toLowerCase() === username.toLowerCase()
    );

    // ADMIN LOOKUP FEATURE
    // If admin is checking by Telegram handle (@username), lookup their Goated username
    if (!userStats && msg.from?.username === 'xGoombas' && username.startsWith('@')) {
      const telegramUser = await db.select()
        .from(telegramUsers)
        .where(eq(telegramUsers.telegramId, username.substring(1)))
        .execute();

      // If found, look up their stats using their Goated username
      if (telegramUser?.[0]?.goatedUsername) {
        userStats = transformedData?.find(u =>
          u.name.toLowerCase() === telegramUser[0].goatedUsername?.toLowerCase()
        );
      }
    }

    // Handle case where user isn't found in stats
    if (!userStats) {
      return bot.sendMessage(chatId, 'User not found.');
    }

    // FORMAT AND SEND RESPONSE
    // Display all wager statistics with proper formatting
    const message = `📊 Stats for ${userStats.name}:\n
Monthly Wager: $${(userStats.wagered?.this_month || 0).toLocaleString()}
Weekly Wager: $${(userStats.wagered?.this_week || 0).toLocaleString()}
Daily Wager: $${(userStats.wagered?.today || 0).toLocaleString()}
All-time Wager: $${(userStats.wagered?.all_time || 0).toLocaleString()}`;

    return bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Error checking stats:', error);
    return bot.sendMessage(chatId, 'An error occurred while fetching stats.');
  }
});

// Bonus code state cleanup timer (5 minutes)
const BONUS_CODE_STATE_TIMEOUT = 5 * 60 * 1000;

// Create bonus code command
bot.onText(/\/createbonus/, async (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from?.username;

  if (username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can create bonus codes.');
  }

  // Clear any existing state
  if (bonusCodeState.has(chatId)) {
    clearTimeout(bonusCodeState.get(chatId).timeout);
    bonusCodeState.delete(chatId);
  }

  // Set state with timeout
  const timeout = setTimeout(() => {
    if (bonusCodeState.has(chatId)) {
      bonusCodeState.delete(chatId);
      bot.sendMessage(chatId, '⌛ Bonus code creation timed out. Please start again with /createbonus');
    }
  }, BONUS_CODE_STATE_TIMEOUT);

  bonusCodeState.set(chatId, {
    step: 'code',
    timeout
  });

  const message = '🎁 Let\'s create a bonus code!\n\n' +
    'Enter the bonus code (e.g. VIPSG2EZ)\n' +
    'Rules:\n' +
    '- Use only letters and numbers\n' +
    '- No spaces allowed\n' +
    '- Keep it memorable\n' +
    '- Code must be unique\n\n' +
    '⌛ You have 5 minutes to complete this process';

  return bot.sendMessage(chatId, message);
});

// Handle bonus code creation steps
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const state = bonusCodeState.get(chatId);

  if (!state) return;

  const text = msg.text;
  if (!text) return;

  try {
    switch (state.step) {
      case 'code':
        if (!/^[A-Za-z0-9]{4,16}$/.test(text)) {
          await bot.sendMessage(chatId, '❌ Invalid code format. Use 4-16 letters and numbers only.');
          return;
        }

        // Check for duplicate code
        const existingCode = await db
          .select()
          .from(bonusCodes)
          .where(eq(bonusCodes.code, text.toUpperCase()))
          .execute();

        if (existingCode.length > 0) {
          await bot.sendMessage(chatId, '❌ This code already exists. Please choose a different code.');
          return;
        }

        state.code = text.toUpperCase();
        state.step = 'wagerAmount';
        await bot.sendMessage(chatId, '💰 Enter the required wager amount (min: 100, max: 1000000):');
        break;

      case 'wagerAmount':
        const wagerAmount = parseFloat(text);
        if (isNaN(wagerAmount) || wagerAmount < 100 || wagerAmount > 1000000) {
          await bot.sendMessage(chatId, '❌ Invalid wager amount. Enter a number between 100 and 1,000,000.');
          return;
        }
        state.wagerAmount = wagerAmount;
        state.step = 'wagerPeriod';
        await bot.sendMessage(chatId, '⏳ Enter the wager period in days (1, 7, or 30):');
        break;

      case 'wagerPeriod':
        const period = parseInt(text);
        if (![1, 7, 30].includes(period)) {
          await bot.sendMessage(chatId, '❌ Invalid period. Choose 1, 7, or 30 days.');
          return;
        }
        state.wagerPeriod = period;
        state.step = 'rewardAmount';
        await bot.sendMessage(chatId, '🎯 Enter the reward amount (min: 1, max: 1000):');
        break;

      case 'rewardAmount':
        const rewardAmount = parseFloat(text);
        if (isNaN(rewardAmount) || rewardAmount < 1 || rewardAmount > 1000) {
          await bot.sendMessage(chatId, '❌ Invalid reward amount. Enter a number between 1 and 1000.');
          return;
        }
        state.rewardAmount = rewardAmount;
        state.step = 'maxClaims';
        await bot.sendMessage(chatId, '👥 Enter max number of claims (1-100):');
        break;

      case 'maxClaims':
        const maxClaims = parseInt(text);
        if (isNaN(maxClaims) || maxClaims < 1 || maxClaims > 100) {
          await bot.sendMessage(chatId, '❌ Invalid number of claims. Enter a number between 1 and 100.');
          return;
        }
        state.maxClaims = maxClaims;
        state.step = 'expiry';
        await bot.sendMessage(chatId, '⏰ Enter expiry in hours (12-168):');
        break;

      case 'expiry':
        const expiryHours = parseInt(text);
        if (isNaN(expiryHours) || expiryHours < 12 || expiryHours > 168) {
          await bot.sendMessage(chatId, '❌ Invalid expiry. Enter hours between 12 and 168 (1 week).');
          return;
        }

        try {
          const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

          // Create bonus code in database
          const [bonusCode] = await db.insert(bonusCodes)
            .values({
              code: state.code,
              wagerAmount: state.wagerAmount,
              wagerPeriodDays: state.wagerPeriod,
              rewardAmount: state.rewardAmount.toString(),
              maxClaims: state.maxClaims,
              currentClaims: 0,
              createdBy: msg.from?.username || 'admin',
              expiresAt,
              status: 'active'
            })
            .returning();

          if (!bonusCode) {
            throw new Error('Failed to create bonus code');
          }

          const previewMessage = `✅ Bonus code created!\n\n` +
            `Code: ||${state.code}||\n` +
            `Wager Requirement: $${state.wagerAmount.toLocaleString()}\n` +
            `Time Period: ${state.wagerPeriod} days\n` +
            `Reward: $${state.rewardAmount}\n` +
            `Max Claims: ${state.maxClaims}\n` +
            `Expires: ${expiresAt.toLocaleString()}\n\n` +
            `Use /deploybonus ${state.code} to announce this code.`;

          await bot.sendMessage(chatId, previewMessage, { parse_mode: 'MarkdownV2' });

          // Clear state and timeout
          clearTimeout(state.timeout);
          bonusCodeState.delete(chatId);

          logDebug('Bonus code created', bonusCode);
        } catch (error) {
          logDebug('Error creating bonus code', error);
          await bot.sendMessage(chatId, '❌ Database error while creating bonus code. Please try again.');
        }
        break;
    }
  } catch (error) {
    logDebug('Error in bonus code creation', error);
    await bot.sendMessage(chatId, '❌ An error occurred. Please try again with /createbonus');
    // Clear state and timeout on error
    clearTimeout(state.timeout);
    bonusCodeState.delete(chatId);
  }
});

// Deploy bonus code command
bot.onText(/\/deploybonus (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const username = msg.from?.username;

  if (username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can deploy bonus codes.');
  }

  const code = match?.[1]?.toUpperCase();
  if (!code) {
    return bot.sendMessage(chatId, 'Usage: /deploybonus CODE');
  }

  // Verify the bonus code exists and is active
  const [existingCode] = await db.select()
    .from(bonusCodes)
    .where(and(
      eq(bonusCodes.code, code),
      eq(bonusCodes.status, 'active')
    ))
    .execute();

  if (!existingCode) {
    return bot.sendMessage(chatId, '❌ Bonus code not found or not active.');
  }

  try {
    const [bonusCode] = await db
      .select()
      .from(bonusCodes)
      .where(eq(bonusCodes.code, code))
      .execute();

    if (!bonusCode) {
      return bot.sendMessage(chatId, '❌ Bonus code not found.');
    }

    const announcement =
      'Sup VIPS 🐐\nCode time!\n\n' +
      `Wager amount: $${bonusCode.wagerAmount} wagered on Goated past ${bonusCode.wagerPeriodDays} days.\n\n` +
      `$${bonusCode.rewardAmount} for the first ${bonusCode.maxClaims} in this group only!\n\n` +
      'Here\'s the code:\n' +
      `🎲 ||${bonusCode.code}|| 🎲\n\n` +
      'Must be one of my Affiliates: [goated.com/r/goatedvips](https://goated.com/r/goatedvips)\n\n' +
      `$${bonusCode.rewardAmount} for first ${bonusCode.maxClaims} users!\n\n` +
      'Good luck!\n\n' +
      '\\*Codes are case sensitive*\n' +
      '\\*Must be an affiliate to claim*';

    // Send to all allowed groups
    for (const groupId of ALLOWED_GROUP_IDS) {
      try {
        await bot.sendMessage(groupId, announcement, {
          parse_mode: 'MarkdownV2',
          disable_web_page_preview: true
        });
      } catch (error) {
        console.error('Error sending to group:', error);
      }
    }

    return bot.sendMessage(chatId, '✅ Bonus code deployed successfully!');
  } catch (error) {
    console.error('Error deploying bonus code:', error);
    return bot.sendMessage(chatId, '❌ Error deploying bonus code.');
  }
});

// Admin commands
bot.onText(/\/makeadmin/, async (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from?.username;

  if (username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can use this command.');
  }
  try {
    const [user] = await db
      .update(users)
      .set({ isAdmin: true })
      .where(eq(users.username, username))
      .returning();

    if (user) {
      await bot.sendMessage(chatId, '✅ Admin privileges granted successfully!');
    } else {
      await bot.sendMessage(chatId, '❌ Failed to grant admin privileges. Please try again.');
    }
  } catch (error) {
    console.error('Error granting admin privileges:', error);
    await bot.sendMessage(chatId, '❌ An error occurred while granting admin privileges.');
  }
});

// Admin command to list pending verification requests
bot.onText(/\/pending/, async (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from?.username;

  if (username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can use this command.');
  }

  try {
    const pendingRequests = await db
      .select()
      .from(verificationRequests)
      .where(eq(verificationRequests.status, 'pending'))
      .execute();

    if (!pendingRequests.length) {
      return bot.sendMessage(chatId, '📝 No pending verification requests.');
    }

    const message = await Promise.all(pendingRequests.map(async (request, index) => {
      try {
        const chatMember = await bot.getChatMember(request.telegramId, Number(request.telegramId));
        const username = chatMember.user.username || 'Unknown';
        return `Request #${index + 1}:\n` +
          `📱 Telegram: @${username}\n` +
          `👤 Goated: ${request.goatedUsername}\n` +
          `⏰ Requested: ${new Date(request.requestedAt).toLocaleString()}\n\n` +
          `/verify_user @${username}\n` +
          `/reject_user @${username}\n` +
          `───────────────────`;
      } catch (error) {
        console.error('Error fetching username:', error);
        return `Request #${index + 1}:\n` +
          `📱 Telegram: @${request.telegramId}\n` +
          `👤 Goated: ${request.goatedUsername}\n` +
          `⏰ Requested: ${new Date(request.requestedAt).toLocaleString()}\n\n` +
          `To verify: /verify_user ${request.telegramId}\n` +
          `To reject: /reject_user ${request.telegramId}\n` +
          `───────────────────`;
      }
    }));

    return bot.sendMessage(chatId, `🔍 Pending Verification Requests:\n\n${message}`);
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    return bot.sendMessage(chatId, '❌ Error fetching pending requests.');
  }
});

// Admin command to verify a user
bot.onText(/\/verify_user (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const adminUsername = msg.from?.username;

  if (adminUsername !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can use this command.');
  }

  if (!match?.[1]) {
    return bot.sendMessage(chatId, '❌ Please provide a Telegram username or ID.');
  }

  let telegramId = match[1];
  // If username format is provided (@username), remove @ and find the user's ID
  if (telegramId.startsWith('@')) {
    telegramId = telegramId.substring(1);
    const user = await db.select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramUsername, telegramId))
      .execute();

    if (!user?.[0]) {
      return bot.sendMessage(chatId, '❌ User not found with that username.');
    }
    telegramId = user[0].telegramId;
  }

  try {
    // Update verification request status
    const [request] = await db
      .update(verificationRequests)
      .set({
        status: 'approved',
        verifiedAt: new Date(),
        verifiedBy: adminUsername
      })
      .where(eq(verificationRequests.telegramId, telegramId))
      .returning();

    if (!request) {
      return bot.sendMessage(chatId, '❌ Verification request not found.');
    }

    // Update telegram user verification status
    await db
      .update(telegramUsers)
      .set({ isVerified: true })
      .where(eq(telegramUsers.telegramId, telegramId));

    // Notify user privately
    await bot.sendMessage(telegramId,
      '✅ Your account has been verified!\n\n' +
      'You can now use:\n' +
      '/stats - Check your wager statistics\n' +
      '/race - View your monthly race position\n' +
      '/leaderboard - See top players');

    // Notify in allowed groups
    for (const groupId of ALLOWED_GROUP_IDS) {
      try {
        await bot.sendMessage(groupId, `✅ Welcome ${request.goatedUsername} to GoatedVIPs! Account verified successfully.`);
      } catch (error) {
        console.error('Error sending group notification:', error);
      }
    }

    return bot.sendMessage(chatId, `✅ User ${request.goatedUsername} has been verified.`);
  } catch (error) {
    console.error('Error verifying user:', error);
    return bot.sendMessage(chatId, '❌ Error verifying user.');
  }
});

// Admin command to broadcast message to all users
bot.onText(/\/broadcast (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const adminUsername = msg.from?.username;

  if (adminUsername !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can use this command.');
  }

  if (!match?.[1]) {
    return bot.sendMessage(chatId, '❌ Please provide a message to broadcast.');
  }

  const message = match[1];

  try {
    const verifiedUsers = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.isVerified, true))
      .execute();

    let successCount = 0;
    let failCount = 0;

    for (const user of verifiedUsers) {
      try {
        await bot.sendMessage(user.telegramId, `📢 Announcement:\n${message}`);
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    return bot.sendMessage(chatId,
      `✅ Broadcast complete!\nDelivered to: ${successCount} users\nFailed: ${failCount} users`);
  } catch (error) {
    console.error('Error broadcasting message:', error);
    return bot.sendMessage(chatId, '❌ Error sending broadcast message.');
  }
});

// Helper function to reformat Goated links
function reformatGoatedLinks(text: string): string {
  // Match any Goated.com URL
  const goatedUrlRegex = /https?:\/\/(www\.)?goated\.com\/[^\s]*/gi;
  return text.replace(goatedUrlRegex, (match) => {
    // Keep the original URL if it's already our affiliate link
    if (match.includes('/r/goatedvips')) {
      return match;
    }
    // Replace with our affiliate link
    return 'https://www.goated.com/r/goatedvips';
  });
}

// Admin command to show forwarding setup guide
bot.onText(/\/setup_guide/, async (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from?.username;

  if (username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can use this command.');
  }

  const setupGuide = `📱 *Channel Forwarding Setup Guide*
1️⃣ *Preparation:*
   • Create your channel if you haven't already
   • Add @GoatedVIPsBot as an admin to your channel
   • Make sure your channel is public with a username

2️⃣ *Step-by-Step Setup:*
   1. Add the bot as admin to your channel with these permissions:
      • Post Messages
      • Edit Messages
      • Delete Messages

   2. Get your channel's username (e.g. @YourChannel)

   3. Use this command to start forwarding:
      \`/setup_forwarding @YourChannel\`

3️⃣ *Managing Forwards:*
   • Check status: \`/list_forwardings\`
   • Stop forwarding: \`/stop_forwarding\`
   • Start new forward: \`/setup_forwarding @channel\`

4️⃣ *Features:*
   • Auto-formats Goated links to affiliate links
   • Forwards text & media content
   • Maintains original formatting
   • Real-time forwarding to all configured groups

5️⃣ *Tips:*
   • Test with a small message first
   • Check bot's admin rights if forwarding fails
   • Contact @xGoombas if you need help

*Need assistance? Use /help for all available commands*

2️⃣ *Setup Steps:*
   1. Add the bot as admin to your channel
   2. Use command: \`/setup_forwarding @YourChannel\`
   3. Test by posting in the channel

3️⃣ *Available Commands:*
   • \`/setup_forwarding @channel\` - Start forwarding
   • \`/list_forwardings\` - Show active forwardings
   • \`/stop_forwarding\` - Stop all forwardings

4️⃣ *Features:*
   • Auto-reformats Goated.com links
   • Forwards text & media content
   • Maintains original formatting

Need help? Contact @xGoombas`;

  return bot.sendMessage(chatId, setupGuide, { parse_mode: 'MarkdownV2' });
});

// Admin command to set up channel forwarding
bot.onText(/\/setup_forwarding (@?\w+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const adminUsername = msg.from?.username;
  const channelUsername = match?.[1].replace('@', '');

  if (adminUsername !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can use this command.');
  }

  if (!channelUsername) {
    return bot.sendMessage(chatId,
      '❌ Please provide the channel username.\n' +
      'Example: /setup_forwarding @channelname');
  }

  try {
    // Store the forwarding configuration
    const forwardingConfig = {
      sourceChannel: channelUsername,
      targetGroups: ALLOWED_GROUP_IDS
    };

    // Set up message listener for the channel
    bot.on('channel_post', async (post) => {
      if (post.chat.username?.toLowerCase() === channelUsername.toLowerCase()) {
        try {
          // Process message text if present
          let messageText = post.text || '';
          if (messageText) {
            messageText = reformatGoatedLinks(messageText);
          }

          // Forward to all allowed groups
          for (const groupId of ALLOWED_GROUP_IDS) {
            if (post.text) {
              // If there's text, send reformatted message
              await bot.sendMessage(groupId, messageText, {
                parse_mode: 'HTML',
                disable_web_page_preview: false
              });
            }
            // Forward media content if present
            if (post.photo || post.video || post.document || post.animation) {
              await bot.forwardMessage(groupId, post.chat.id, post.message_id);
            }
          }
        } catch (error) {
          console.error('Error forwarding message:', error);
          await bot.sendMessage(chatId, '❌ Failed to forward message to some groups.');
        }
      }
    });

    return bot.sendMessage(chatId,
      `✅ Successfully set up forwarding from @${channelUsername}\n` +            `Messages will be forwarded to ${ALLOWED_GROUP_IDS.length} group(s)\n` +
      `All Goated.com links will be automatically reformatted with our affiliate link`.`);
  } catch (error) {
    console.error('Error setting up channel forwarding:', error);
    return bot.sendMessage(chatId,
      '❌ Error setting up forwarding. Please ensure:\n' +
      '1. The channel username is correct\n' +
      '2. The channel is public\n' +
      '3. The bot has access to read messages');
  }
});

// Admin command to stop forwarding
bot.onText(/\/stop_forwarding/, async (msg) => {
  const chatId = msg.chat.id;
  const adminUsername = msg.from?.username;

  if (adminUsername !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can use this command.');
  }

  try {
    // Remove channel_post listener
    bot.removeAllListeners('channel_post');
    return bot.sendMessage(chatId, '✅ Successfully stopped all channel forwarding.');
  } catch (error) {
    console.error('Error stopping forwarding:', error);
    return bot.sendMessage(chatId, '❌ Error stopping forwarding.');
  }
});

// Admin command to list active forwardings
bot.onText(/\/list_forwardings/, async (msg) => {
  const chatId = msg.chat.id;
  const adminUsername = msg.from?.username;

  if (adminUsername !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can use this command.');
  }

  return bot.sendMessage(chatId,
    '📋 Active Forwarding Configuration:\n\n' +
    `Target Groups: ${ALLOWED_GROUP_IDS.join(', ')}\n` +
    'All messages are forwarded in real-time with affiliate links reformatted.');
});

// Admin command to broadcast to all groups
bot.onText(/\/broadcast_groups (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const adminUsername = msg.from?.username;

  if (adminUsername !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can use this command.');
  }

  if (!match?.[1]) {
    return bot.sendMessage(chatId, '❌ Please provide a message to broadcast.');
  }

  const message = match[1];
  try {
    // Get all chats where bot is member
    const failedGroups = [];
    let successCount = 0;

    for (const groupId of ALLOWED_GROUP_IDS) {
      try {
        await bot.sendMessage(groupId, `📢 ${message}`);
        successCount++;
      } catch (error) {
        failedGroups.push(groupId);
      }
    }

    return bot.sendMessage(chatId,
      `✅ Group broadcast complete!\nDelivered to: ${successCount} groups\nFailed: ${failedGroups.length} groups`);
  } catch (error) {
    console.error('Error broadcasting to groups:', error);
    return bot.sendMessage(chatId, '❌ Error sending broadcast to groups.');
  }
});

// Admin command to send message to specific group
bot.onText(/\/group_message (.+) (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const adminUsername = msg.from?.username;

  if (adminUsername !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can use this command.');
  }

  const groupId = match?.[1];
  const message = match?.[2];

  if (!groupId || !message) {
    return bot.sendMessage(chatId, '❌ Please provide both group ID and message.\nFormat: /group_message GROUP_ID MESSAGE');
  }

  try {
    await bot.sendMessage(groupId, `📢 ${message}`);
    return bot.sendMessage(chatId, '✅ Message sent to group successfully!');
  } catch (error) {
    console.error('Error sending group message:', error);
    return bot.sendMessage(chatId, '❌ Error sending message to group. Make sure the bot is a member of the group.');
  }
});

// Admin command to send personalized message
bot.onText(/\/message_user (.+?) (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const adminUsername = msg.from?.username;

  if (adminUsername !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can use this command.');
  }

  const targetId = match?.[1];
  const message = match?.[2];

  if (!targetId || !message) {
    return bot.sendMessage(chatId, '❌ Please provide both user ID and message.\nFormat: /message_user USER_ID Your message here');
  }

  try {
    const user = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramId, targetId))
      .execute();

    if (!user?.[0]) {
      return bot.sendMessage(chatId, '❌ User not found.');
    }

    await bot.sendMessage(targetId, `📨 Personal Message:\n${message}`);
    return bot.sendMessage(chatId, `✅ Message sent to ${user[0].goatedUsername || 'user'} successfully!`);
  } catch (error) {
    console.error('Error sending personal message:', error);
    return bot.sendMessage(chatId, '❌ Error sending message to user.');
  }
});

// Admin command to get user info
bot.onText(/\/user_info (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const adminUsername = msg.from?.username;

  if (adminUsername !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can use this command.');
  }

  const userIdentifier = match?.[1];
  if (!userIdentifier) {
    return bot.sendMessage(chatId, '❌ Please provide a Telegram ID or username.');
  }

  try {
    const user = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramId, userIdentifier))
      .execute();

    if (!user?.[0]) {
      return bot.sendMessage(chatId, '❌ User not found.');
    }

    const info = `👤 User Information:
Telegram ID: ${user[0].telegramId}
Goated Username: ${user[0].goatedUsername || 'Not set'}
Verified: ${user[0].isVerified ? '✅' : '❌'}
Created At: ${new Date(user[0].createdAt).toLocaleString()}
Last Active: ${new Date(user[0].lastActive).toLocaleString()}
Notifications: ${user[0].notificationsEnabled ? '✅' : '❌'}`;

    return bot.sendMessage(chatId, info);
  } catch (error) {
    console.error('Error fetching user info:', error);
    return bot.sendMessage(chatId, '❌ Error fetching user information.');
  }
});

// Admin command to reject a user
bot.onText(/\/reject_user (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const adminUsername = msg.from?.username;

  if (adminUsername !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can use this command.');
  }

  if (!match?.[1]) {
    return bot.sendMessage(chatId, '❌ Please provide a Telegram ID.');
  }

  const telegramId = match[1];

  try {
    const [request] = await db
      .update(verificationRequests)
      .set({ status: 'rejected' })
      .where(eq(verificationRequests.telegramId, telegramId))
      .returning();

    if (!request) {
      return bot.sendMessage(chatId, '❌ Verification request not found.');
    }

    // Notify the user
    await bot.sendMessage(telegramId, '❌ Your verification request has been rejected. Please ensure you provided the correct Goated username and try again.');
    return bot.sendMessage(chatId, `❌ Rejected verification request for ${request.goatedUsername}.`);
  } catch (error) {
    console.error('Error rejecting user:', error);
    return bot.sendMessage(chatId, '❌ Error rejecting user.');
  }
});


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
  try {
    await bot.sendPhoto(chatId, `${process.cwd()}/server/telegram/BOTWELCOME.png`);
  } catch (error) {
    console.error('Error sending welcome image:', error);
  }

  const message = `👋 Welcome to the Goated Stats Bot!

⚠️ You must be an affiliate to use this Bot.
To get started, I'll need to verify your Goated.com account username to proceed.

Click the button below to begin verification:`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '🔐 Start Verification', callback_data: 'start_verify' }]
    ]
  };

  return bot.sendMessage(chatId, message, { reply_markup: keyboard });
}

// Rate limiting setup
const rateLimiter = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT = 5; // requests per user
const TIME_WINDOW = 10000; // 10 seconds
const GROUP_COOLDOWN = 2000; // 2 seconds between group commands

// Rate limiting function
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimiter.get(userId);

  if (!userLimit || (now - userLimit.timestamp) > TIME_WINDOW) {
    rateLimiter.set(userId, { count: 1, timestamp: now });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}

// Handle callback queries (button clicks)
async function handleCallbackQuery(callbackQuery: TelegramBot.CallbackQuery) {
  const chatId = callbackQuery.message?.chat.id;
  const messageId = callbackQuery.message?.message_id;
  const telegramId = callbackQuery.from.id.toString();

  if (!chatId || !messageId) return;

  // Apply rate limiting
  if (!checkRateLimit(telegramId)) {
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: '⚠️ Please wait a few seconds before making another request',
      show_alert: true
    });
    return;
  }

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
bot.onText(/\/verify (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();
  const telegramUsername = msg.from?.username;
  const goatedUsername = match?.[1]?.trim();

  if (!telegramId || !goatedUsername) {
    return bot.sendMessage(chatId, '❌ Please provide your Goated username.\nFormat: /verify YourGoatedUsername');
  }

  try {
    // Check if user is already verified
    const existingUser = await db.select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramId, telegramId))
      .execute();

    if (existingUser?.[0]?.isVerified) {
      return bot.sendMessage(chatId, '❌ Your account is already verified.');
    }

    // Check for pending verification
    const pendingRequest = await db.select()
      .from(verificationRequests)
      .where(
        and(
          eq(verificationRequests.telegramId, telegramId),
          eq(verificationRequests.status, 'pending')
        )
      )
      .execute();

    if (pendingRequest?.[0]) {
      return bot.sendMessage(chatId,
        '⏳ You already have a pending verification request.\n' +
        'Please wait for admin approval or contact @xGoombas.');
    }

    // Create/update telegram user entry
    await db.insert(telegramUsers)
      .values({
        telegramId,
        telegramUsername,
        goatedUsername,
        isVerified: false,
        lastActive: new Date()
      })
      .onConflictDoUpdate({
        target: telegramUsers.telegramId,
        set: {
          telegramUsername,
          goatedUsername,
          lastActive: new Date()
        }
      });

    // Create verification request
    await db.insert(verificationRequests)
      .values({
        telegramId,
        telegramUsername,
        goatedUsername,
        status: 'pending',
        requestedAt: new Date()
      });

    // Notify admins about new verification request
    for (const adminId of ADMIN_TELEGRAM_IDS) {
      try {
        await bot.sendMessage(adminId,
          '🔔 New verification request!\n\n' +
          `Telegram: ${telegramUsername ? '@' + telegramUsername : telegramId}\n` +
          `Goated: ${goatedUsername}\n\n` +
          `To verify: /verify_user ${telegramUsername ? '@' + telegramUsername : telegramId}\n` +
          `To reject: /reject_user ${telegramUsername ? '@' + telegramUsername : telegramId}`
        );
      } catch (error) {
        console.error('Error notifying admin:', error);
      }
    }

    return bot.sendMessage(chatId,
      '✅ Verification request submitted!\n\n' +
      'Please wait for admin approval.\n' +
      'You will be notified once your account is verified.');

  } catch (error) {
    console.error('Verification error:', error);
    return bot.sendMessage(chatId,
      '❌ An error occurred during verification.\n' +
      'Please try again or contact @xGoombas if the issue persists.');
  }
});

bot.onText(/\/stats/, handleStats);
bot.onText(/\/race/, handleRace);
bot.onText(/\/leaderboard/, handleLeaderboard);
bot.onText(/\/play/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId,
    '🎮 Click here to play on Goated:\nhttps://www.goated.com/r/goatedvips\n\n' +
    '💰 Make sure to use our link to get the best rakeback and rewards!');
});

bot.onText(/\/website/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId,
    '🌐 Visit our website:\nhttps://goatedvips.gg\n\n' +
    '📊 Check leaderboards, tips, and latest promotions!');
});

bot.on('callback_query', handleCallbackQuery);

// Handle inline queries for quick stats lookup
bot.on('inline_query', async (query) => {
  try {
    // First check if user is verified
    const user = await db.select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramId, query.from.id.toString()))
      .execute();

    if (!user?.[0]?.isVerified) {
      return bot.answerInlineQuery(query.id, [{
        type: 'article',
        id: 'not_verified',
        title: '❌ Verification Required',
        description: 'You need to verify your account to check stats',
        input_message_content: {
          message_text: 'You need to verify your account first. Start a private chat with @GoatedVIPsBot and use /start'
        }
      }]);
    }

    if (!query.query) {
      return bot.answerInlineQuery(query.id, [{
        type: 'article',
        id: 'help',
        title: 'Search for a user',
        description: 'Type a Goated username to check their stats',
        input_message_content: {
          message_text: 'To check stats, type @GoatedVIPsBot followed by a username'
        }
      }]);
    }

    const leaderboardData = await fetchLeaderboardData();
    const transformedData = transformLeaderboardData(leaderboardData);

    const matchingUsers = transformedData
      ?.filter(u => u.username.toLowerCase().includes(query.query.toLowerCase()))
      .slice(0, 5)
      .map(user => ({
        type: 'article',
        id: user.username,
        title: user.username,
        description: `Monthly: $${user.wagered.this_month.toLocaleString()}`,
        input_message_content: {
          message_text: `📊 Stats for ${user.username}:
Monthly: $${user.wagered.this_month.toLocaleString()}
All-time: $${user.wagered.all_time.toLocaleString()}`
        }
      }));

    return bot.answerInlineQuery(query.id, matchingUsers || []);
  } catch (error) {
    console.error('Error handling inline query:', error);
  }
});

// Challenge creation state storage
const challengeCreationState = new Map();

// Create challenge command
bot.onText(/\/createchallenge/, async (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from?.username;

  if (username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can create challenges.');
  }

  challengeCreationState.set(chatId, { step: 'game' });

  const message = `🎮 Select the game for this challenge:
1. Limbo
2. Keno
3. Dice
4. Crash
5. Mines

Reply with the number or game name.`;

  return bot.sendMessage(chatId, message);
});

// Handle challenge creation steps
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const state = challengeCreationState.get(chatId);

  if (!state) return;

  try {
    const text = msg.text;
    if (!text) return;

    switch (state.step) {
      case 'game':
        state.game = text;
        state.step = 'multiplier';
        await bot.sendMessage(chatId, '🎯 Enter target multiplier (e.g. 10x):');
        break;

      case 'multiplier':
        state.multiplier = text;
        state.step = 'minBet';
        await bot.sendMessage(chatId, '💰 Enter minimum bet amount:');
        break;

      case 'minBet':
        state.minBet = text;
        state.step = 'prize';
        await bot.sendMessage(chatId, '🏆 Enter prize amount:');
        break;

      case 'prize':
        state.prizeAmount = text;
        state.step = 'maxWinners';
        await bot.sendMessage(chatId, '👥 Enter maximum number of winners:');
        break;

      case 'maxWinners':
        const maxWinners = parseInt(text);
        if (isNaN(maxWinners) || maxWinners < 1) {
          await bot.sendMessage(chatId, '❌ Please enter a valid number greater than 0.');
          return;
        }
        state.maxWinners = maxWinners;
        state.step = 'description';
        await bot.sendMessage(chatId, '📝 Enter challenge description (or type "none"):');
        break;

      case 'description':
        state.description = text === 'none' ? '' : text;

        // Create challenge in database
        try {
          const [challenge] = await db.insert(challenges)
            .values({
              game: state.game,
              multiplier: state.multiplier,
              minBet: state.minBet,
              prizeAmount: state.prizeAmount,
              maxWinners: state.maxWinners,
              description: state.description,
              createdBy: msg.from?.username || 'admin',
              status: 'active'
            })
            .returning()
            .execute();

          // Format announcement
          const announcement = `🔥 **Goated Challenge Time!** 🔥

🎮 **Game:** ${state.game}
🎯 **Goal:** Hit a **${state.multiplier}x** multiplier
💵 **Minimum Bet:** $${state.minBet}
🏆 **Prize:** $${state.prizeAmount}
👥 **Max Winners:** ${state.maxWinners}
${state.description ? `\n📝 **Details:** ${state.description}` : ''}

To enter:
1. Place your bet
2. Hit the target multiplier
3. Send screenshot with /submit command

Good luck! 🍀`;

          // Send to all allowed groups
          for (const groupId of ALLOWED_GROUP_IDS) {
            try {
              await bot.sendMessage(groupId, announcement, {
                parse_mode: 'Markdown'
              });
            } catch (error) {
              console.error('Error sending to group:', error);
            }
          }

          challengeCreationState.delete(chatId);
          await bot.sendMessage(chatId, '✅ Challenge created and announced!');
        } catch (error) {
          console.error('Error creating challenge:', error);
          await bot.sendMessage(chatId, '❌ Error creating challenge. Please try again.');
        }
        break;
    }
  } catch (error) {
    console.error('Error in challenge creation:', error);
    challengeCreationState.delete(chatId);
    await bot.sendMessage(chatId, '❌ An error occurred. Please try again with /createchallenge');
  }
});

// View active challenges
bot.onText(/\/challenges/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const activeChalls = await db
      .select()
      .from(challenges)
      .where(eq(challenges.status, 'active'))
      .execute();

    if (!activeChalls.length) {
      return bot.sendMessage(chatId, '📝 No active challenges at the moment.');
    }

    const message = activeChalls.map((challenge, index) => {
      return `Challenge #${index + 1}:\n` +
        `🎮 Game: ${challenge.game}\n` +
        `🎯 Target: ${challenge.multiplier}x\n` +
        `💵 Min Bet: $${challenge.minBet}\n` +
        `🏆 Prize: $${challenge.prizeAmount}\n` +
        `👥 Max Winners: ${challenge.maxWinners}\n` +
        (challenge.description ? `📝 Details: ${challenge.description}\n` : '') +
        `\n───────────────────`;
    }).join('\n\n');

    return bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Error fetching challenges:', error);
    return bot.sendMessage(chatId, '❌ Error fetching challenges.');
  }
});

// Submit challenge entry
bot.onText(/\/submit (.+)/, async (msg, match) => {
  if (!match?.[1]) {
    return bot.sendMessage(msg.chat.id, '❌ Please provide your bet link.\nFormat: /submit BET_LINK');
  }

  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();

  if (!telegramId) return;

  try {
    // Get active challenges
    const activeChalls = await db
      .select()
      .from(challenges)
      .where(eq(challenges.status, 'active'))
      .orderBy(challenges.createdAt);

    if (!activeChalls.length) {
      return bot.sendMessage(chatId, '❌ No active challenges at the moment.');
    }

    // Record entry for the latest challenge
    const challenge = activeChalls[0];

    await db.insert(challengeEntries)
      .values({
        challengeId: challenge.id,
        telegramId,
        betLink: match[1],
        status: 'pending'
      })
      .execute();

    await bot.sendMessage(chatId,
      `✅ Challenge entry recorded!\n` +
      `@xGoombas will verify your entry soon.`);
  } catch (error) {
    console.error('Error submitting challenge entry:', error);
    return bot.sendMessage(chatId, '❌ Error submitting entry. Please try again.');
  }
});

// Admin command to view pending challenge entries
bot.onText(/\/pendingchallenges/, async (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from?.username;

  if (username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can use this command.');
  }

  try {
    const pendingEntries = await db
      .select()
      .from(challengeEntries)
      .where(eq(challengeEntries.status, 'pending'))
      .orderBy(challengeEntries.submittedAt)
      .execute();

    if (!pendingEntries.length) {
      return bot.sendMessage(chatId, '📝 No pending challenge entries.');
    }

    const message = pendingEntries.map((entry, index) => {
      return `Entry #${index + 1}:\n` +
        `👤 User: ${entry.telegramId}\n` +
        `🎯 Challenge ID: ${entry.challengeId}\n` +
        `🎲 Bet Link: ${entry.betLink}\n` +
        `⏰ Submitted: ${new Date(entry.submittedAt).toLocaleString()}\n\n` +
        `/verifychallenge ${entry.id}\n` +
        `/rejectchallenge ${entry.id}\n` +
        `───────────────────`;
    }).join('\n\n');

    return bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Error fetching pending entries:', error);
    return bot.sendMessage(chatId, '❌ Error fetching pending entries.');
  }
});

// Admin command to verify challenge entry
bot.onText(/\/verifychallenge (\d+) (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const username = msg.from?.username;

  if (username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can use this command.');
  }

  const entryId = match?.[1];
  const bonusCode = match?.[2];

  if (!entryId || !bonusCode) {
    return bot.sendMessage(chatId,
      '❌ Please provide entry ID and bonus code.\n' +
      'Format: /verifychallenge ENTRY_ID BONUS_CODE');
  }

  try {
    const [entry] = await db
      .update(challengeEntries)
      .set({
        status: 'verified',
        bonusCode,
        verifiedAt: new Date(),
        verifiedBy: username
      })
      .where(eq(challengeEntries.id, parseInt(entryId)))
      .returning()
      .execute();

    if (!entry) {
      return bot.sendMessage(chatId, '❌ Entry not found.');
    }

    // Notify user
    await bot.sendMessage(entry.telegramId,
      '🎉 Congratulations! Your challenge entry has been verified!\n\n' +
      `Here's your bonus code: ${bonusCode}\n\n` +
      'Redeem it on Goated.com for your reward!');

    return bot.sendMessage(chatId, '✅ Entry verified and user notified!');
  } catch (error) {
    console.error('Error verifying entry:', error);
    return bot.sendMessage(chatId, '❌ Error verifying entry.');
  }
});

// Admin command to reject challenge entry
bot.onText(/\/rejectchallenge (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const username = msg.from?.username;

  if (username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can use this command.');
  }

  const entryId = match?.[1];

  if (!entryId) {
    return bot.sendMessage(chatId, '❌ Please provide the entry ID.\nFormat: /rejectchallenge ENTRY_ID');
  }

  try {
    const [entry] = await db
      .update(challengeEntries)
      .set({
        status: 'rejected',
        verifiedAt: new Date(),
        verifiedBy: username
      })
      .where(eq(challengeEntries.id, parseInt(entryId)))
      .returning()
      .execute();

    if (!entry) {
      return bot.sendMessage(chatId, '❌ Entry not found.');
    }

    // Notify user
    await bot.sendMessage(entry.telegramId,
      '❌ Your challenge entry was not approved.\n' +
      'Please make sure to follow the challenge rules and try again!');

    return bot.sendMessage(chatId, '✅ Entry rejected and user notified.');
  } catch (error) {
    console.error('Error rejecting entry:', error);
    return bot.sendMessage(chatId, '❌ Error rejecting entry.');
  }
});

// Command to claim bonus codes for verified challenges
bot.onText(/\/claim/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();

  if (!telegramId) {
    return bot.sendMessage(chatId, '❌ Could not identify user.');
  }

  try {
    const entries = await db
      .select()
      .from(challengeEntries)
      .where(
        and(
          eq(challengeEntries.telegramId, telegramId),
          eq(challengeEntries.status, 'verified'),
          sql`${challengeEntries.bonusCode} IS NOT NULL`
        )
      )
      .execute();

    if (!entries.length) {
      return bot.sendMessage(chatId, 'No verified challenges to claim.');
    }

    const message = entries.map(e =>
      `🎁 Bonus Code: ||${e.bonusCode}||`
    ).join('\n\n');

    return bot.sendMessage(chatId, message, { parse_mode: 'MarkdownV2' });
  } catch (error) {
    console.error('Error claiming bonus codes:', error);
    return bot.sendMessage(chatId, '❌ Error retrieving your bonus codes.');
  }
});

// Export bot instance for use in main server
export { bot };