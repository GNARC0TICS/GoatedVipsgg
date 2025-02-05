import TelegramBot from 'node-telegram-bot-api';
import { db } from '@db';
import { telegramUsers, verificationRequests } from '@db/schema/telegram';
import { eq } from 'drizzle-orm';
import { API_CONFIG } from '../config/api';
import { users } from '@db/schema';

const token = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_TELEGRAM_IDS = ['1689953605'];
const ALLOWED_GROUP_IDS = process.env.ALLOWED_GROUP_IDS?.split(',') || [];

if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN must be provided');
}

// Create a bot instance with polling
const bot = new TelegramBot(token, { polling: false });

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
      { command: 'makeadmin', description: '👑 Grant admin privileges' }
    ];

    // Set base commands globally
    await bot.setMyCommands(baseCommands);

    // Set admin commands for private chats with admins
    for (const adminId of ADMIN_TELEGRAM_IDS) {
      try {
        await bot.setMyCommands(adminCommands, {
          scope: { type: 'chat', chat_id: adminId }
        });
      } catch (error) {
        console.error(`Error setting admin commands for ${adminId}:`, error);
      }
    }

    // Admin commands will be set when you first interact with the bot
    bot.on('message', async (msg) => {
      if (msg.from?.username === 'xGoombas') {
        try {
          await bot.setMyCommands(adminCommands, { 
            scope: { 
              type: 'chat',
              chat_id: msg.chat.id 
            }
          });
        } catch (error) {
          console.error('Error setting admin commands:', error);
        }
      }
    });

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

  let message = `🐐 *Welcome to Goated Stats Bot\\!*\n\n`;

  if (msg.from?.username === 'xGoombas') {
    message += `*Admin Commands:*\n`;
    message += `• /broadcast \\- Send message to all users\n`;
    message += `• /group\\_message \\- Send message to group\n`;
    message += `• /user\\_info \\- Get user information\n`;
    message += `• /pending \\- View verification requests\n`;
    message += `• /verify\\_user \\- Verify a user\n`;
    message += `• /reject\\_user \\- Reject a verification\n\n`;
  }

  message += `*Available Commands:*\n`;
  message += `• /start \\- Get started with the bot\n`;
  message += `• /verify \\- Link your Goated account\n`;
  message += `• /stats \\- View your wager statistics\n`;
  message += `• /check\\_stats \\- Check stats for username\n`;
  message += `• /race \\- Check your race position\n`;
  message += `• /leaderboard \\- See top players\n`;
  message += `• /play \\- Play on Goated with our link\n`;
  message += `• /website \\- Visit GoatedVIPs\\.gg\n\n`;
  message += `Need help? Contact @xGoombas for support\\.`;

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
      .set({ status: 'approved' })
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

2️⃣ *Step\-by\-Step Setup:*
   1\. Add the bot as admin to your channel with these permissions:
      • Post Messages
      • Edit Messages
      • Delete Messages

   2\. Get your channel's username \(e\.g\. @YourChannel\)

   3\. Use this command to start forwarding:
      \`/setup_forwarding @YourChannel\`

3️⃣ *Managing Forwards:*
   • Check status: \`/list_forwardings\`
   • Stop forwarding: \`/stop_forwarding\`
   • Start new forward: \`/setup_forwarding @channel\`

4️⃣ *Features:*
   • Auto\-formats Goated links to affiliate links
   • Forwards text & media content
   • Maintains original formatting
   • Real\-time forwarding to all configured groups

5️⃣ *Tips:*
   • Test with a small message first
   • Check bot's admin rights if forwarding fails
   • Contact @xGoombas if you need help

*Need assistance? Use /help for all available commands*

2️⃣ *Setup Steps:*
   1\. Add the bot as admin to your channel
   2\. Use command: \`/setup_forwarding @YourChannel\`
   3\. Test by posting in the channel

3️⃣ *Available Commands:*
   • \`/setup_forwarding @channel\` \- Start forwarding
   • \`/list_forwardings\` \- Show active forwardings
   • \`/stop_forwarding\` \- Stop all forwardings

4️⃣ *Features:*
   • Auto\-reformats Goated\.com links
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
      `✅ Successfully set up forwarding from @${channelUsername}\n` +
      `Messages will be forwarded to ${ALLOWED_GROUP_IDS.length} group(s)\n` +
      `All Goated.com links will be automatically reformatted with our affiliate link.`);
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
    await bot.sendPhoto(chatId, './server/telegram/BOTWELCOME.png');
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
async function handleVerify(msg: TelegramBot.Message, match: RegExpExecArray | null) {
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
    return bot.sendMessage(chatId, 
      '✅ Your account is already verified!\n\n' +
      'Available commands:\n' +
      '/stats - Check your wager statistics\n' +
      '/race - View your monthly race position\n' +
      '/leaderboard - See top players');
  }

  // If in group chat, direct to private chat
  if (chatId < 0) {
    return bot.sendMessage(
      chatId,
      'Please start a private chat with me to complete the verification process:\n' +
      'https://t.me/GoatedVIPsBot?start=verify'
    );
  }

  // If no username provided, ask for it
  if (!match?.[1]) {
    return bot.sendMessage(chatId,
      'Please provide your Goated username with the command.\n' +
      'Example: /verify YourUsername\n\n' +
      'Make sure to use your exact username as shown on the platform.');
  }

  const goatedUsername = match[1].trim();

  try {
    // Try to fetch user stats directly
    const response = await fetch(
        `http://0.0.0.0:5000/api/affiliate/stats?username=${encodeURIComponent(goatedUsername)}`,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to verify username');
      }

      const userData = await response.json();
      const userExists = userData?.data?.monthly?.data?.some(
        (u: any) => u.name.toLowerCase() === goatedUsername.toLowerCase()
      );

      if (userExists) {
      // Create or update verification request
      await db.delete(verificationRequests)
        .where(eq(verificationRequests.telegramId, telegramId));

      await db.insert(verificationRequests)
        .values({
          telegramId,
          goatedUsername,
          status: 'pending',
          requestedAt: new Date()
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
          `New verification request:\nTelegram User: ${msg.from?.username || 'Unknown'}\nGoated Username: ${goatedUsername}`,
          { reply_markup: keyboard }
        );
      }

      return bot.sendMessage(
        chatId,
        '✅ Account found! Verification request submitted.\n\n' +
        'Please be patient while your account is awaiting verification.\n' +
        'You will receive a notification once the process is complete.'
      );
    } else {
      return bot.sendMessage(chatId,
        '❌ Account not found!\n\n' +
        'Please check:\n' +
        '1. Your username is exactly as shown on Goated.com\n' +
        '2. You have completed at least one wager\n' +
        '3. You are using our affiliate link: goated.com/r/goatedvips\n\n' +
        'If you need help, contact @xGoombas');
    }
  } catch (error) {
    console.error('Error in handleVerify', error);
    if (error.message === 'Failed to verify username') {
      return bot.sendMessage(chatId, 
        '❌ Unable to verify username at this time.\n' +
        'Please ensure:\n' +
        '1. Your username is exactly as shown on Goated\n' +
        '2. You have completed at least one wager\n' +
        '3. The API service is available\n\n' +
        'Try again in a few minutes or contact @xGoombas for help.');
    }
    return bot.sendMessage(chatId, 
      '❌ An error occurred during verification.\n' +
      'Please try again or contact @xGoombas if the issue persists.');
  }
}

// Group chat optimization
const groupLastCommand = new Map<number, number>();

function isGroupChat(chatId: number): boolean {
  return chatId < 0;
}

function canProcessGroupCommand(chatId: number): boolean {
  if (!isGroupChat(chatId)) return true;
  
  const now = Date.now();
  const lastCommand = groupLastCommand.get(chatId) || 0;
  
  if (now - lastCommand < GROUP_COOLDOWN) return false;
  
  groupLastCommand.set(chatId, now);
  return true;
}

async function handleStats(msg: TelegramBot.Message) {
  // Add group command cooldown
  if (!canProcessGroupCommand(msg.chat.id)) {
    return;
  }
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();
  const isSilentCommand = msg.text?.startsWith('/.');

  // Validate chat is allowed if it's a group
  if (chatId < 0 && !ALLOWED_GROUP_IDS.includes(chatId.toString())) {
    return bot.sendMessage(chatId, 'This bot is not authorized for use in this group.');
  }

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

    // If silent command, send response as private message
    if (isSilentCommand && msg.from) {
      return bot.sendMessage(msg.from.id, message);
    }
    return bot.sendMessage(chatId, message);
  } catch (error) {
    logDebug('Error in handleStats', error);
    const errorMsg = 'An error occurred while fetching your stats. Please try again later.';
    return isSilentCommand && msg.from 
      ? bot.sendMessage(msg.from.id, errorMsg)
      : bot.sendMessage(chatId, errorMsg);
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

// Handle leaderboard command
async function handleLeaderboard(msg: TelegramBot.Message) {
  const chatId = msg.chat.id;

  try {
    const leaderboardData = await fetchLeaderboardData();
    const transformedData = transformLeaderboardData(leaderboardData);

    if (!transformedData || !Array.isArray(transformedData) || transformedData.length === 0) {
      return bot.sendMessage(chatId, 'No race data available at the moment. Please try again later.');
    }

    const leaderboard = transformedData
      .slice(0, 10)
      .map((user, index) => {
        return `${index + 1}. ${user.username}\n   💰 $${user.wagered.this_month.toLocaleString()}`;
      })
      .join('\n\n');

    const message = `🏆 Monthly Race Leaderboard\n` +
      `💵 Prize Pool: $${PRIZE_POOL.toLocaleString()}\n` +
      `🏁 Current Top 10:\n\n${leaderboard}`;

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

// Helper function to fetch leaderboard data from our platform
// Fetches leaderboard data for Telegram bot display
// This function connects to our internal API to get real-time wager data
async function fetchLeaderboardData() {
  try {
    logDebug('Attempting to fetch leaderboard data');

    // Connect to our internal API endpoint running on port 5000
    // This is the same data source used by the web interface
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
function transformLeaderboardData(apiData: any) {
  if (!apiData?.data?.participants && !apiData?.participants) {
    logDebug('Invalid leaderboard data format', { data: apiData });
    return null;
  }

  const participants = apiData.data?.participants || apiData.participants;
  if (!Array.isArray(participants)) {
    logDebug('Participants is not an array', { participants });
    return null;
  }

  return participants.map(user => ({
    ...user,
    username: user.name,
    wagered: {
      this_month: user.wagered,
      today: 0,
      this_week: 0,
      all_time: 0
    }
  }));
}


// Check if user is admin
function isAdmin(telegramId: string): boolean {
  return ADMIN_TELEGRAM_IDS.includes(telegramId);
}

// Register event handlers
bot.onText(/\/start/, handleStart);
bot.onText(/\/verify(?:\s+(.+))?/, handleVerify);
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

  const text = msg.text;
  if (!text) return;

  switch (state.step) {
    case 'game':
      state.game = text;
      state.step = 'multiplier';
      await bot.sendMessage(chatId, '🎯 Enter the target multiplier (e.g., 66.0):');
      break;

    case 'multiplier':
      state.multiplier = text;
      state.step = 'minBet';
      await bot.sendMessage(chatId, '💰 Enter the minimum bet amount (e.g., 0.02):');
      break;

    case 'minBet':
      state.minBet = text;
      state.step = 'prize';
      await bot.sendMessage(chatId, '🏆 Enter the prize amount per winner (e.g., 5):');
      break;

    case 'prize':
      state.prize = text;
      state.step = 'winners';
      await bot.sendMessage(chatId, '👥 Enter the number of winners (e.g., 3):');
      break;

    case 'winners':
      state.winners = parseInt(text);
      state.step = 'timeframe';
      await bot.sendMessage(chatId, '⏳ Enter the timeframe (or "until filled"):');
      break;

    case 'timeframe':
      state.timeframe = text;
      state.step = 'description';
      await bot.sendMessage(chatId, '📝 Enter any additional description (or "none"):');
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
            prizeAmount: state.prize,
            maxWinners: state.winners,
            timeframe: state.timeframe,
            description: state.description,
            createdBy: msg.from?.username || 'admin'
          })
          .returning();

        // Format announcement
        const announcement = `🔥 **Goated Challenge Time!** 🔥

🎮 **Game:** ${state.game}
🎯 **Goal:** Hit a **${state.multiplier}x** multiplier
💵 **Minimum Bet:** $${state.minBet}
💰 **Prize:** $${state.prize} Bonus Code
👥 **Winners:** ${state.winners}
⏳ **Duration:** ${state.timeframe}
${state.description ? `\n📌 **Note:** ${state.description}` : ''}

**How to enter:**
1️⃣ Post your winning Goated bet link
2️⃣ Use #ChallengeComplete
3️⃣ Tag @xGoombas

Good luck, Goated VIPs! 🐐✨`;

        // Send to all allowed groups
        for (const groupId of ALLOWED_GROUP_IDS) {
          await bot.sendMessage(groupId, announcement, { parse_mode: 'Markdown' });
        }

        challengeCreationState.delete(chatId);
        await bot.sendMessage(chatId, '✅ Challenge created and announced successfully!');
      } catch (error) {
        console.error('Error creating challenge:', error);
        await bot.sendMessage(chatId, '❌ Error creating challenge. Please try again.');
      }
      break;
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
      return bot.sendMessage(chatId, 'No active challenges at the moment!');
    }

    const message = activeChalls.map((c, i) => `
🎮 Challenge #${i + 1}:
Game: ${c.game}
Goal: ${c.multiplier}x multiplier
Min Bet: $${c.minBet}
Prize: $${c.prizeAmount}
Remaining Winners: ${c.maxWinners}
⏳ ${c.timeframe}`).join('\n\n');

    return bot.sendMessage(chatId, `🏆 Active Challenges:\n${message}`);
  } catch (error) {
    console.error('Error fetching challenges:', error);
    return bot.sendMessage(chatId, '❌ Error fetching challenges. Please try again.');
  }
});

// Handle challenge submissions
bot.onText(/#ChallengeComplete/, async (msg) => {
  if (!msg.text?.includes('goated.com/')) return;

  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();
  
  if (!telegramId) return;

  try {
    const betLink = msg.text.match(/(https?:\/\/[^\s]+)/g)?.[0];
    if (!betLink) return;

    // Get active challenges
    const activeChalls = await db
      .select()
      .from(challenges)
      .where(eq(challenges.status, 'active'))
      .execute();

    if (!activeChalls.length) return;

    // Record entry for the latest challenge
    const challenge = activeChalls[0];
    
    await db.insert(challengeEntries)
      .values({
        challengeId: challenge.id,
        telegramId,
        betLink,
        status: 'pending'
      })
      .execute();

    await bot.sendMessage(chatId, 
      `✅ Challenge entry recorded!\n` +
      `@xGoombas will verify your entry soon.`);
  } catch (error) {
    console.error('Error recording challenge entry:', error);
  }
});

// Admin command to view pending entries
bot.onText(/\/pendingchallenges/, async (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from?.username;

  if (username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can view pending challenges.');
  }

  try {
    const entries = await db
      .select()
      .from(challengeEntries)
      .where(eq(challengeEntries.status, 'pending'))
      .execute();

    if (!entries.length) {
      return bot.sendMessage(chatId, 'No pending challenge entries.');
    }

    const message = entries.map((e, i) => `
Entry #${i + 1}:
User: ${e.telegramId}
Bet Link: ${e.betLink}
Submitted: ${new Date(e.submittedAt).toLocaleString()}

To verify: /verifychallenge ${e.id}
To reject: /rejectchallenge ${e.id}`).join('\n\n');

    return bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Error fetching pending entries:', error);
    return bot.sendMessage(chatId, '❌ Error fetching pending entries.');
  }
});

// Verify challenge command
bot.onText(/\/verifychallenge (\d+) (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const username = msg.from?.username;

  if (username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can verify challenges.');
  }

  const entryId = match?.[1];
  const bonusCode = match?.[2];

  if (!entryId || !bonusCode) {
    return bot.sendMessage(chatId, 'Usage: /verifychallenge [entry_id] [bonus_code]');
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
      .returning();

    if (!entry) {
      return bot.sendMessage(chatId, '❌ Entry not found.');
    }

    // Notify user
    await bot.sendMessage(entry.telegramId,
      '🎉 Your challenge entry has been verified!\n' +
      'Use /claim in private chat with me to get your bonus code.');

    return bot.sendMessage(chatId, '✅ Challenge verified and user notified.');
  } catch (error) {
    console.error('Error verifying challenge:', error);
    return bot.sendMessage(chatId, '❌ Error verifying challenge.');
  }
});

// Claim command (private chat only)
bot.onText(/\/claim/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();

  if (!telegramId) return;

  // Must be in private chat
  if (chatId < 0) {
    return bot.sendMessage(chatId, 'Please use /claim in private chat with me.');
  }

  try {
    const entries = await db
      .select()
      .from(challengeEntries)
      .where(
        and(
          eq(challengeEntries.telegramId, telegramId),
          eq(challengeEntries.status, 'verified')
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
    console.error('Error claiming rewards:', error);
    return bot.sendMessage(chatId, '❌ Error claiming rewards.');
  }
});

// Export bot instance for use in main server
export { bot, handleStart, handleVerify, handleStats, handleRace, handleLeaderboard, handleCallbackQuery };