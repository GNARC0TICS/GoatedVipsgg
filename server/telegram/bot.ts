import TelegramBot, { Message, ChatMember } from 'node-telegram-bot-api';
import { db } from '@db';
import { eq } from 'drizzle-orm';
import { telegramUsers, verificationRequests, challenges, challengeEntries } from '@db/schema/telegram';
import { users } from '@db/schema';
import '@types/node-schedule';
import { scheduleJob } from 'node-schedule';

// Types for bot
interface Challenge {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  prizePool: number;
}

interface ChallengeEntry {
  id: string;
  userId: string;
  challengeId: string;
  score: number;
  rank: number;
  createdAt: Date;
  updatedAt: Date;
}

// Create singleton bot instance with polling enabled
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN must be provided');
}

const bot = new TelegramBot(token, { polling: true });
console.log('[Telegram Bot] Created with polling enabled');

// Constants
const ADMIN_TELEGRAM_IDS = ['1689953605']; 
const ALLOWED_GROUP_IDS = process.env.ALLOWED_GROUP_IDS?.split(',') || [];

// Add constants for AI conversation
const CONVERSATION_COOLDOWN = 10000; // 10 seconds between AI responses
const BEGGING_PATTERNS = {
  DIRECT: [
    'give me', 'send me', 'need money', 'spare some', 
    'can send?', 'sen pls', 'pls send', 'send pls',
    'send coin', 'gimme', 'hook me up', 'need help$',
    'can you send', 'send some', 'send anything'
  ],
  SUBTLE: [
    'broke', 'poor', 'help me out', 'anything helps',
    'can i get a tip', 'tip me', 'pls', 'plz',
    'no money', 'struggling', 'desperate', 'appreciate anything',
    'having a hard time', 'need assistance', 'could use help'
  ],
  SPAM: [
    'copy paste', 'forwarded message', 'chain message',
    'mass message', 'spam', 'bulk message'
  ],
  SHARING: [
    'airdrop', 'giveaway', 'sharing',
    'giving away', 'drop', 'contest'
  ]
};

// Message tracking for spam detection
const userMessageCounts = new Map<string, { count: number; timestamp: number; warnings: number }>();

// Enhanced warning messages for begging
const BEGGING_WARNINGS = [
  "⚠️ @{username} Begging is not allowed in this group. Focus on participating in races and events instead!",
  "⚠️ Hey @{username}, we don't allow begging here. Try joining our monthly races to earn rewards!",
  "⚠️ @{username} This is a warning for begging. Join the community events instead of asking for handouts!",
  "⚠️ @{username} No begging allowed! Check /help to see how you can earn through races and challenges."
];

// Bot personality traits
const BOT_PERSONALITY = {
  FRIENDLY: ['Hey!', 'Hi there!', 'Hello!', 'Sup!'],
  HELPFUL: ['Let me help you with that!', 'I can assist with that!', 'I got you!'],
  PLAYFUL: ['😎', '🎮', '🎲'],
  CONGRATULATORY: ['Well done!', 'Amazing!', 'Great job!', 'Fantastic!']
};

// Helper function to check if a message contains begging
function containsBegging(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Check direct begging patterns
  if (BEGGING_PATTERNS.DIRECT.some(pattern => lowerText.includes(pattern))) {
    return true;
  }

  // Check subtle begging patterns
  if (BEGGING_PATTERNS.SUBTLE.some(pattern => lowerText.includes(pattern))) {
    // If it contains 'pls' or 'plz', do additional context check
    if (lowerText.includes('pls') || lowerText.includes('plz')) {
      // Look for money/sending related words near 'pls'
      const moneyWords = ['send', 'give', 'tip', 'money', 'coin', 'spare', 'help', 'need'];
      return moneyWords.some(word => lowerText.includes(word));
    }
    return true;
  }

  // Check if message contains multiple currency symbols or numbers with currency
  const currencyPattern = /[\$\€\£\¥]|([0-9]+\s*(dollars|euros|usd|coins|tips))/gi;
  const currencyMatches = lowerText.match(currencyPattern) || [];
  if (currencyMatches.length > 0 && BEGGING_PATTERNS.SUBTLE.some(pattern => lowerText.includes(pattern))) {
    return true;
  }

  return false;
}

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

// Debug logging function
function logDebug(message: string, data?: any) {
  console.log(`[Telegram Bot] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}


const COMMAND_COOLDOWN = 3000; // 3 seconds cooldown between commands
const MUTE_DURATIONS = {
  SHORT: 300, // 5 minutes
  MEDIUM: 3600, // 1 hour
  LONG: 86400, // 24 hours
};

const SPAM_DETECTION = {
  TIME_WINDOW: 30000, // 30 seconds
  MAX_MESSAGES: 5,    // 5 messages
  MUTE_DURATION: 300, // 5 minutes
  WARNINGS_BEFORE_BAN: 3,
  BAN_DURATION: 86400 // 24 hours
};

const BEGGING_KEYWORDS = [
  'give me', 'please give', 'need money', 'send me',
  'deposit', 'broke', 'need help', 'money please',
  'spare some', 'donation', 'help me'
];

// Command cooldown tracking
const commandCooldowns = new Map<string, { command: string; timestamp: number }>();

// Helper function to check command cooldown
function checkCommandCooldown(userId: string, command: string): boolean {
  const now = Date.now();
  const userCooldown = commandCooldowns.get(userId);

  if (!userCooldown || (now - userCooldown.timestamp) > COMMAND_COOLDOWN) {
    commandCooldowns.set(userId, { command, timestamp: now });
    return true;
  }

  return false;
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
      { command: 'adminpanel', description: 'Admin Control Panel' },
      { command: 'add_recurring_message', description: '➕ Add recurring message'},
      { command: 'list_recurring_messages', description: '📋 List recurring messages'},
      { command: 'remove_recurring_message', description: '❌ Remove recurring message'}
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
    message += `• /reject\\_user \\- Reject a verification\n`;
    message += `• /makeadmin \\- Grant admin privileges\n`;
    message += `• /adminpanel \\- Access the admin panel\n`;
    message += `• /mute @username duration \\- Mute a user\n`;
    message += `• /warn @username reason \\- Warn a user\n`;
    message += `• /ban @username reason \\- Ban a user\n`;
    message += `• /bootfuck @username \\- Bootfuck a user\n\n`;
    message += `*Recurring Messages:*\n`;
    message += `• /add\\_recurring\\_message \\- Add a recurring message\n`;
    message += `• /list\\_recurring\\_messages \\- List recurring messages\n`;
    message += `• /remove\\_recurring\\_message \\- Remove a recurring message\n\n`;
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
      .set({ status: 'approved', updatedAt: new Date() })
      .where(eq(verificationRequests.telegramId, telegramId))
      .returning();

    if (!request) {
      return bot.sendMessage(chatId, '❌ Verification request not found.');
    }

    // Update telegram user verification status
    await db
      .update(telegramUsers)
      .set({ isVerified: true, updatedAt: new Date() })
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

// Enhanced message handler with better spam detection
bot.on('message', async (msg) => {
  if (!msg.text || !msg.from || msg.chat.type === 'private') return;

  const userId = msg.from.id.toString();
  const chatId = msg.chat.id;
  const messageText = msg.text.toLowerCase();
  const now = Date.now();

  // Get or initialize user's message tracking
  let userTracking = userMessageCounts.get(userId) || { count: 0, timestamp: now, warnings: 0 };

  // Reset counter if time window has passed
  if (now - userTracking.timestamp > SPAM_DETECTION.TIME_WINDOW) {
    userTracking = { count: 1, timestamp: now, warnings: userTracking.warnings };
  } else {
    userTracking.count++;
  }

  userMessageCounts.set(userId, userTracking);

  // Check for spam
  if (userTracking.count > SPAM_DETECTION.MAX_MESSAGES) {
    try {
      userTracking.warnings++;
      userMessageCounts.set(userId, userTracking);

      // Delete spam messages
      try {
        await bot.deleteMessage(chatId, msg.message_id.toString());
      } catch (error) {
        console.error('Error deleting spam message:', error);
      }

      if (userTracking.warnings >= SPAM_DETECTION.WARNINGS_BEFORE_BAN) {
        // Ban user for repeated spam
        await bot.banChatMember(chatId, Number(userId), {
          until_date: Math.floor(now / 1000) + SPAM_DETECTION.BAN_DURATION
        });
        await bot.sendMessage(chatId,
          `🚫 ${msg.from.username || userId} has been banned for repeated spamming.`);
      } else {
        // Mute user temporarily
        await bot.restrictChatMember(chatId, Number(userId), {
          until_date: Math.floor(now / 1000) + SPAM_DETECTION.MUTE_DURATION,
          permissions: {
            can_send_messages: false,
            can_send_media_messages: false,
            can_send_other_messages: false,
            can_add_web_page_previews: false
          }
        });
        await bot.sendMessage(chatId,
          `⚠️ @${msg.from.username} has been muted for ${SPAM_DETECTION.MUTE_DURATION / 60} minutes due to spamming.\n` +
          `Warning ${userTracking.warnings}/${SPAM_DETECTION.WARNINGS_BEFORE_BAN}`);
      }
    } catch (error) {
      console.error('Error handling spam:', error);
    }
    return;
  }

  // Check for begging
  const isBegging = containsBegging(messageText);

  if (isBegging) {
    try {
      await bot.deleteMessage(chatId, msg.message_id.toString());
      const warningMessage = BEGGING_WARNINGS[Math.floor(Math.random() * BEGGING_WARNINGS.length)]
        .replace('{username}', msg.from.username || userId);
      
      await bot.sendMessage(chatId, warningMessage);

      // Increment warning count
      userTracking.warnings++;
      userMessageCounts.set(userId, userTracking);

      if (userTracking.warnings >= SPAM_DETECTION.WARNINGS_BEFORE_BAN) {
        await bot.banChatMember(chatId, Number(userId));
        await bot.sendMessage(chatId,
          `🚫 ${msg.from.username || userId} has been banned for repeated begging despite warnings.`);
      }
    } catch (error) {
      console.error('Error handling begging:', error);
    }
  }

  // Positive reinforcement for sharing
  const isSharing = BEGGING_PATTERNS.SHARING
    .some(pattern => messageText.includes(pattern));

  if (isSharing && !isBegging) {
    // Random delay to make it feel more natural
    setTimeout(async () => {
      try {
        await bot.sendMessage(chatId,
          `Thanks for sharing with the community, @${msg.from.username}! 🎁`);
      } catch (error) {
        console.error('Error sending appreciation message:', error);
      }
    }, Math.random() * 2000 + 1000); // Random delay between 1-3 seconds
  }
});

// Add group rules command with proper markdown formatting
bot.onText(/\/rules/, async (msg) => {
  const chatId = msg.chat.id;

  const rulesMessage = `🐐 *GoatedVIPs Group Rules* 🐐

1️⃣ *General Group Behavior*
• Respect all members and admins
• No spam or excessive messages 
• Keep discussions related to Goated and gambling
• English only in main chat
• No referral links except official GoatedVIPs links

2️⃣ *Zero Tolerance Policies*
• NO begging for money/coins/tips
• NO scamming or suspicious links
• NO harassment or bullying
• NO political or religious discussions
• NO advertising without admin approval

3️⃣ *Race & Competition Guidelines*
• Verify your account to participate
• Follow race requirements exactly
• No multi\\-accounting or cheating
• Report issues to admins only
• Accept all admin decisions as final

4️⃣ *Verification Requirements*
• Use /verify command with your Goated username
• Account must be active on Goated
• Follow verification instructions exactly
• Wait for admin approval
• Keep your Telegram username stable

5️⃣ *Moderation & Consequences*
• 1st Offense: Warning
• 2nd Offense: 24hr mute
• 3rd Offense: 1 week mute
• Severe/Repeated: Permanent ban
• Begging = Instant mute/possible ban

6️⃣ *Rewards & Benefits*
• Monthly race prizes
• Regular giveaways
• Special verified member perks
• Community challenges
• Exclusive promotions

💡 *Need help?*
• Use /help for bot commands
• Contact @xGoombas for support
• Check pinned messages for updates

⚠️ *Note:* Breaking these rules may result in immediate removal from the group\\. Admins reserve the right to modify rules or take action as needed\\.

_Stay Goated, Stay Winning\\! 🐐_`;

  try {
    await bot.sendMessage(chatId, rulesMessage, {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true
    });
  } catch (error) {
    console.error('Error sending rules message:', error);
    // Send plain text version if markdown fails
    await bot.sendMessage(chatId, rulesMessage.replace(/[*_\\]/g, ''), {
      disable_web_page_preview: true
    });
  }
});

// Export bot instance for other modules
export default bot;

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

   2\. Get your channel's username (e\.g\. @YourChannel)

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
    return bot.sendMessage(
      chatId,
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
      .set({ status: 'rejected', updatedAt: new Date() })
      .where(eq(verificationRequests.telegramId, telegramId))
      .returning();

    if (!request) {
      return bot.sendMessage(chatId, '❌ Verification request not found.');
    }

    // Notify the user
    await bot.sendMessage(telegramId, '❌ Your verification request has been rejected. Please ensure you provided the correct Goated username and try again.');
    return bot.sendMessage(chatId, `❌ Rejected verification request for ${request.goatedUsername}`);
  } catch (error) {
    console.error('Error rejectinguser:', error);
    return bot.sendMessage(chatId, '❌ Error rejecting user.');
  }

// Add recurring message system
// Interface is already declared above, so we only add implementation

// Helper function to schedule a recurring message
function scheduleRecurringMessage(message: RecurringMessage): void {
  scheduleJob(message.schedule, async () => {
    if (!message.enabled) return;

    for (const groupId of message.targetGroups) {
      try {
        await bot.sendMessage(groupId, message.message);
        logDebug(`Recurring message ${message.id} sent to group ${groupId}`);
      } catch (error) {
        console.error(`Error sending recurring message to group ${groupId}:`, error);
      }
    }
  });
}

// Storage for recurring messages
const recurringMessages = new Map<string, RecurringMessage>();

// Admin command to add recurring message
bot.onText(/\/add_recurring_message/, async (message: Message) => {
  const chatId = message.chat.id;
  const username = message.from?.username;

  if (username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can manage recurring messages.');
  }

  try {
    // Get message details through conversation
    await bot.sendMessage(chatId, 'Please send the message you want to schedule:');
    
    const messageResponse = await new Promise<Message>((resolve) => {
      const messageHandler = (response: Message) => {
        if (response.chat.id === chatId) {
          bot.removeListener('message', messageHandler);
          resolve(response);
        }
      };
      bot.on('message', messageHandler);
    });

    await bot.sendMessage(chatId, 'Please send the schedule in cron format (e.g., "0 9 * * *" for daily at 9 AM):');
    
    const scheduleResponse = await new Promise<Message>((resolve) => {
      const scheduleHandler = (response: Message) => {
        if (response.chat.id === chatId) {
          bot.removeListener('message', scheduleHandler);
          resolve(response);
        }
      };
      bot.on('message', scheduleHandler);
    });

    // Use crypto.randomUUID() to generate unique ID 
    const messageId = crypto.randomUUID();
    const newRecurringMessage: RecurringMessage = {
      id: messageId,
      message: messageResponse.text || '',
      schedule: scheduleResponse.text || '',
      targetGroups: ALLOWED_GROUP_IDS,
      enabled: true
    };

    recurringMessages.set(messageId, newRecurringMessage);
    scheduleRecurringMessage(newRecurringMessage);

    return bot.sendMessage(chatId,
      `✅ Recurring message added successfully!\n` +
      `ID: ${messageId}\n` +
      `Schedule: ${newRecurringMessage.schedule}\n` +
      `Target Groups: ${newRecurringMessage.targetGroups.length}`);
  } catch (error) {
    console.error('Error adding recurring message:', error);
    return bot.sendMessage(chatId, '❌ Error setting up recurring message.');
  }
});

// Admin command to list recurring messages
bot.onText(/\/list_recurring_messages/, async (message: Message) => {
  const chatId = message.chat.id;
  const username = message.from?.username;

  if (username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can view recurring messages.');
  }

  const messageList = Array.from(recurringMessages.values())
    .map(msg => 
      `🔄 Message ID: ${msg.id}\n` +
      `📝 Content: ${msg.message}\n` +
      `⏰ Schedule: ${msg.schedule}\n` +
      `Status: ${msg.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
      `───────────────────`
    ).join('\n\n');

  return bot.sendMessage(chatId,
    messageList || '📝 No recurring messages set up.');
});

// Admin command to remove recurring message
bot.onText(/\/remove_recurring_message (.+)/, async (message: Message, match: RegExpExecArray | null) => {
  const chatId = message.chat.id;
  const username = message.from?.username;

  if (username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can remove recurring messages.');
  }

  const messageId = match?.[1];
  if (!messageId) {
    return bot.sendMessage(chatId, '❌ Please provide a message ID.');
  }

  if (recurringMessages.delete(messageId)) {
    return bot.sendMessage(chatId, '✅ Recurring message removed successfully!');
  } else {
    return bot.sendMessage(chatId, '❌ Message not found.');
  }
});
  message: string;
  schedule: string;
  targetGroups: string[];
  enabled: boolean;
}

// Helper function to schedule a recurring message
function scheduleRecurringMessage(message: RecurringMessage): void {
  return scheduleJob(message.schedule, async () => {
    if (!message.enabled) return;

    for (const groupId of message.targetGroups) {
      try {
        await bot.sendMessage(groupId, message.message);
        logDebug(`Recurring message ${message.id} sent to group ${groupId}`);
      } catch (error) {
        console.error(`Error sending recurring message to group ${groupId}:`, error);
      }
    }
  });
}

// Storage for recurring messages 
const recurringMessages = new Map<string, RecurringMessage>();

// Admin command to add recurring message
bot.onText(/\/add_recurring_message/, async (message: Message) => {
  const chatId = message.chat.id;
  const username = message.from?.username;

  if (username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can manage recurring messages.');
  }

  try {
    // Get message details through conversation
    await bot.sendMessage(chatId, 'Please send the message you want to schedule:');
    
    const messageResponse = await new Promise<Message>((resolve) => {
      const messageHandler = (response: Message) => {
        if (response.chat.id === chatId) {
          bot.removeListener('message', messageHandler);
          resolve(response);
        }
      };
      bot.on('message', messageHandler);
    });

    await bot.sendMessage(chatId, 'Please send the schedule in cron format (e.g., "0 9 * * *" for daily at 9 AM):');
    
    const scheduleResponse = await new Promise<Message>((resolve) => {
      const scheduleHandler = (response: Message) => {
        if (response.chat.id === chatId) {
          bot.removeListener('message', scheduleHandler);
          resolve(response);
        }
      };
      bot.on('message', scheduleHandler);
    });

    // Use crypto.randomUUID() to generate unique ID
    const messageId = crypto.randomUUID();
    const recurringMessage: RecurringMessage = {
      id: messageId,
      message: messageResponse.text || '',
      schedule: scheduleResponse.text || '',
      targetGroups: ALLOWED_GROUP_IDS,
      enabled: true
    };

    recurringMessages.set(messageId, recurringMessage);
    scheduleRecurringMessage(recurringMessage);

    return bot.sendMessage(chatId,
      `✅ Recurring message added successfully!\n` +
      `ID: ${messageId}\n` +
      `Schedule: ${recurringMessage.schedule}\n` +
      `Target Groups: ${recurringMessage.targetGroups.length}`);
  } catch (error) {
    console.error('Error adding recurring message:', error);
    return bot.sendMessage(chatId, '❌ Error setting up recurring message.');
  }
});

// Admin command to list recurring messages
bot.onText(/\/list_recurring_messages/, async (message: Message) => {
  const chatId = message.chat.id;
  const username = message.from?.username;

  if (username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can view recurring messages.');
  }

  const messageList = Array.from(recurringMessages.values())
    .map(message => 
      `🔄 Message ID: ${message.id}\n` +
      `📝 Content: ${message.message}\n` +
      `⏰ Schedule: ${message.schedule}\n` +
      `Status: ${message.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
      `───────────────────`
    ).join('\n\n');

  return bot.sendMessage(chatId,
    messageList || '📝 No recurring messages set up.');
});

// Admin command to remove recurring message
bot.onText(/\/remove_recurring_message (.+)/, async (message: Message, match: RegExpExecArray | null) => {
  const chatId = message.chat.id;
  const username = message.from?.username;

  if (username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can remove recurring messages.');
  }

  const messageId = match?.[1];
  if (!messageId) {
    return bot.sendMessage(chatId, '❌ Please provide a message ID.');
  }

  if (recurringMessages.delete(messageId)) {
    return bot.sendMessage(chatId, '✅ Recurring message removed successfully!');
  } else {
    return bot.sendMessage(chatId, '❌ Message not found.');
  }
});

const recurringMessages = new Map<string, RecurringMessage>();

// Helper function to schedule a recurring message
function scheduleRecurringMessage(message: RecurringMessage) {
  return scheduleJob(message.schedule, async () => {
    if (!message.enabled) return;

    for (const groupId of message.targetGroups) {
      try {
        await bot.sendMessage(groupId, message.message);
        console.log(`[Recurring Message] Sent message ${message.id} to group ${groupId}`);
      } catch (error) {
        console.error(`[Recurring Message] Error sending to group ${groupId}:`, error);
      }
    }
  });
}

// Admin command to add recurring message
bot.onText(/\/add_recurring_message/, async (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from?.username;

  if (username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can manage recurring messages.');
  }

  try {
    // Get message details through conversation
    await bot.sendMessage(chatId, 'Please send the message you want to schedule:');
    
    const messageResponse = await new Promise<Message>((resolve) => {
      const messageHandler = (response: Message) => {
        if (response.chat.id === chatId) {
          bot.removeListener('message', messageHandler);
          resolve(response);
        }
      };
      bot.on('message', messageHandler);
    });

    await bot.sendMessage(chatId, 'Please send the schedule in cron format (e.g., "0 9 * * *" for daily at 9 AM):');
    
    const scheduleResponse = await new Promise<Message>((resolve) => {
      const scheduleHandler = (response: Message) => {
        if (response.chat.id === chatId) {
          bot.removeListener('message', scheduleHandler);
          resolve(response);
        }
      };
      bot.on('message', scheduleHandler);
    });

    const messageId = crypto.randomUUID();
    const recurringMessage: RecurringMessage = {
      id: messageId,
      message: messageResponse.text || '',
      schedule: scheduleResponse.text || '',
      targetGroups: ALLOWED_GROUP_IDS,
      enabled: true
    };

    recurringMessages.set(messageId, recurringMessage);
    scheduleRecurringMessage(recurringMessage);

    return bot.sendMessage(chatId,
      `✅ Recurring message added successfully!\n` +
      `ID: ${messageId}\n` +
      `Schedule: ${recurringMessage.schedule}\n` +
      `Target Groups: ${recurringMessage.targetGroups.length}`);
  } catch (error) {
    console.error('Error adding recurring message:', error);
    return bot.sendMessage(chatId, '❌ Error setting up recurring message.');
  }
});

// Admin command to list recurring messages
bot.onText(/\/list_recurring_messages/, async (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from?.username;

  if (username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can view recurring messages.');
  }

  const messageList = Array.from(recurringMessages.values())
    .map(message => 
      `🔄 Message ID: ${message.id}\n` +
      `📝 Content: ${message.message}\n` +
      `⏰ Schedule: ${message.schedule}\n` +
      `Status: ${message.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
      `───────────────────`
    ).join('\n\n');

  return bot.sendMessage(chatId,
    messageList || '📝 No recurring messages set up.');
});

// Admin command to remove recurring message
bot.onText(/\/remove_recurring_message (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const username = msg.from?.username;

  if (username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can remove recurring messages.');
  }

  const messageId = match?.[1];
  if (!messageId) {
    return bot.sendMessage(chatId, '❌ Please provide a message ID.');
  }

  if (recurringMessages.delete(messageId)) {
    return bot.sendMessage(chatId, '✅ Recurring message removed successfully!');
  } else {
    return bot.sendMessage(chatId, '❌ Message not found.');
  }
});

// Add prize pool constants to match web interface
const PRIZE_POOL = 500;
const PRIZEDISTRIBUTION: Record<number, number> = {
  1: 0.425, // $212.50
  2: 0.2,   // $100
  3: 0.15,  // $60
  4: 0.075, // $30
  5: 0.06,  // $24
  6: 0.04,  // $16  7: 0.0275, // $11
  8: 0.0225, // $9
  9: 0.0175, // $7
  10: 0.0175, // $7
};

// Helper function to get prize amount
function getPrizeAmount(rank: number): number {
  return Math.round(PRIZE_POOL * (PRIZEDISTRIBUTION[rank] || 0) * 100) / 100;
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
const TIME_WINDOW = 10000; // 10 seconds between requests
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

// Add AI conversation cooldown tracking
const conversationCooldowns = new Map<string, number>();

// Helper function to check conversation cooldown
function canRespond(userId: string): boolean {
  const now = Date.now();
  const lastResponse = conversationCooldowns.get(userId);

  if (!lastResponse || (now - lastResponse) > CONVERSATION_COOLDOWN) {
    conversationCooldowns.set(userId, now);
    return true;
  }
  return false;
}

// Helper function to generate natural responses
function generateResponse(type: string, context: any = {}): string {
  switch (type) {
    case 'stats_redirect':
      return `${BOT_PERSONALITY.FRIENDLY[Math.floor(Math.random() * BOT_PERSONALITY.FRIENDLY.length)]} You can check your stats using the /stats command! Make sure you're verified first! ${BOT_PERSONALITY.PLAYFUL[Math.floor(Math.random() * BOT_PERSONALITY.PLAYFUL.length)]}`;
    case 'leaderboard_info':
      return `Currently in our monthly race, ${context.topUser} is leading with $${context.topAmount.toLocaleString()} wagered! ${context.timeLeft} days left until we crown our winner! How's everyone doing? 🏆`;
    case 'verification_help':
      return `To get verified, just use the /verify command followed by your Goated username. Once you're verified, you'll have access to all the stats and features! Need help? Contact @xGoombas!`;
    default:
      return BOT_PERSONALITY.HELPFUL[Math.floor(Math.random() * BOT_PERSONALITY.HELPFUL.length)];
  }
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
  const username = match?.[1]?.trim();

  if (!telegramId) {
    return bot.sendMessage(chatId, 'Could not identify user.');
  }

  // If in group chat, direct to private chat
  if (msg.chat.type !== 'private') {
    return bot.sendMessage(
      chatId,
      'Please start a private chat with me to complete the verification process:\n' +
      'https://t.me/GoatedVIPsBot?start=verify'
    );
  }

  if (!username) {
    return bot.sendMessage(chatId,
      'Please provide your Goated username with the command.\n' +
      'Example: /verify YourUsername\n\n' +
      'Make sure to use your exact username as shown on the platform.');
  }

  try {
    console.log(`[Verification] Attempting to verify username: ${username}`);

    // Check if user already has a pending verification
    const existingRequest = await db.select()
      .from(verificationRequests)
      .where(eq(verificationRequests.telegramId, telegramId))
      .execute();

    if (existingRequest?.[0]?.status === 'pending') {
      return bot.sendMessage(chatId,
        '⏳ You already have a pending verification request.\n\n' +
        'Please wait for an admin to review your request.\n' +
        'If you need help, contact @xGoombas');
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

    // Create or update telegram user record
    await db.insert(telegramUsers)
      .values({
        telegramId: telegramId,
        telegramUsername: msg.from?.username || null,
        goatedUsername: username,
        isVerified: false,
        notificationsEnabled: true,
        lastActive: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [telegramUsers.telegramId],
        set: {
          telegramUsername: msg.from?.username || null,
          goatedUsername: username,
          lastActive: new Date(),
          updatedAt: new Date()
        }
      })
      .execute();

    // Create verification request
    await db.insert(verificationRequests)
      .values({
        telegramId: telegramId,
        goatedUsername: username,
        status: 'pending',
        telegramUsername: msg.from?.username || null,
        requestedAt: new Date(),
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [verificationRequests.telegramId],
        set: {
          goatedUsername: username,
          status: 'pending',
          telegramUsername: msg.from?.username || null,
          requestedAt: new Date(),
          updatedAt: new Date()
        }
      })
      .execute();

    await bot.sendMessage(chatId,
      '✅ Verification request submitted!\n\n' +
      'Please wait while an admin reviews your request.\n' +
      'You will be notified once your account is verified.\n\n' +
      'If you need help, contact @xGoombas');

    // Notify admins about new verification request
    for (const adminId of ADMIN_TELEGRAM_IDS) {
      try {
        await bot.sendMessage(adminId,
          `🆕 New verification request:\n\n` +
          `User: ${msg.from?.username ? '@' + msg.from.username : 'No username'}\n` +
          `Goated: ${username}\n\n` +
          `To verify: /verify_user ${telegramId}\n` +
          `To reject: /reject_user ${telegramId}`);
      } catch (error) {
        console.error('Error notifying admin:', error);
      }
    }

    return;
  } catch (error) {
    console.error('Error in verification process:', error);
    return bot.sendMessage(chatId,
      '❌ An error occurred during verification.\n' +
      'Please try again later or contact @xGoombas for assistance.');
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
            createdBy: msg.from?.username || 'admin',
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'active'
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
        status: 'pending',
        submittedAt: new Date(),
        updatedAt: new Date()
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
        verifiedBy: username,
        updatedAt: new Date()
      })
      .where(eq(challengeEntries.id, parseInt(entryId)))
      .returning();

    if (!entry) {
      return bot.sendMessage(chatId, '❌ Entry not found.');
    }

    //    // Notify user
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

// Admin panel command handler
bot.onText(/\/adminpanel/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id.toString();
  const username = msg.from?.username;

  if (!userId || username !== 'xGoombas') {
    return bot.sendMessage(chatId, `Only authorized users can access the admin panel.`);
  }

  if (!checkCommandCooldown(userId, 'adminpanel')) {
    return bot.sendMessage(chatId, 'Please wait before using this command again.');
  }

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🔇 Mute User', callback_data: 'admin_mute' },
        { text: '⚠️ Warn User', callback_data: 'admin_warn' }
      ],
      [
        { text: '🚫 Ban User', callback_data: 'admin_ban' },
        { text: '👢 Bootfuck User', callback_data: 'admin_bootfuck' }
      ],
      [
        { text: '📢 Broadcast', callback_data: 'admin_broadcast' },
        { text: '🔄 Recurring Messages', callback_data: 'admin_recurring' }
      ],
      [
        { text: '👥 User Management', callback_data: 'admin_users' }
      ]
    ]
  };

  await bot.sendMessage(chatId,
    'Admin Control Panel\n\n' +
    'Select an action from the menu below:',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    }
  );
});

// Update the callback query handler to include broadcast
bot.on('callback_query', async (query) => {
  if (!query.message || !query.from) return;

  const chatId = query.message.chat.id;
  const userId = query.from.id.toString();
  const username = query.from.username;

  if (username !== 'xGoombas') {
    await bot.answerCallbackQuery(query.id, {
      text: 'Only authorized users can use these controls.',
      show_alert: true
    });
    return;
  }

  switch (query.data) {
    case 'admin_mute':
      await bot.sendMessage(chatId,
        'To mute a user:\n/mute @username duration_in_seconds');
      break;
    case 'admin_warn':
      await bot.sendMessage(chatId,
        'To warn a user:\n/warn @username reason');
      break;
    case 'admin_ban':
      await bot.sendMessage(chatId,
        'To ban a user:\n/ban @username reason');
      break;
    case 'admin_bootfuck':
      await bot.sendMessage(chatId,
        'To bootfuck a user:\n/bootfuck @username');
      break;
    case 'admin_broadcast':
      await bot.sendMessage(chatId,
        'To broadcast a message:\n/broadcast Your message here\n' +
        'To send to specific group:\n/group_message GROUP_ID Your message here');
      break;
    case 'admin_recurring':
      const recurringKeyboard = {
        inline_keyboard: [
          [
            { text: '➕ Add Message', callback_data: 'recurring_add' },
            { text: '📋 List Messages', callback_data: 'recurring_list' }
          ],
          [
            { text: '❌ Remove Message', callback_data: 'recurring_remove' }
          ]
        ]
      };
      await bot.editMessageText(
        'Recurring Message Management\n\n' +
        'Select an action:',
        {
          chat_id: chatId,
          message_id: query.message.message_id,
          reply_markup: recurringKeyboard
        }
      );
      break;
    case 'admin_users':
      await bot.sendMessage(chatId, '/pending - View pending verification requests');
      break;
  }

  await bot.answerCallbackQuery(query.id);
});

// Handle mute command
bot.onText(/\/mute (@?\w+) (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id.toString();
  const username = msg.from?.username;

  if (!userId || username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can mute members.');
  }

  if (!checkCommandCooldown(userId, 'mute')) {
    return bot.sendMessage(chatId, '⚠️ Please wait before using this command again.');
  }

  const targetUser = match?.[1];
  const duration = parseInt(match?.[2] || '300'); // Default 5 minutes

  try {
    // Implementation to mute user
    await bot.restrictChatMember(chatId, targetUser, {
      until_date: Math.floor(Date.now() / 1000) + duration,
      permissions: {
        can_send_messages: false,
        can_send_media_messages: false,
        can_send_other_messages: false,
        can_add_web_page_previews: false
      }
    });

    await bot.sendMessage(chatId,
      `🔇 ${targetUser} has been muted for ${duration} seconds.`);
  } catch (error) {
    console.error('Error muting user:', error);
    await bot.sendMessage(chatId,
      '❌ Failed to mute user. Make sure the bot has admin privileges.');
  }
});

// Handle warn command
bot.onText(/\/warn (@?\w+) (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id.toString();
  const username = msg.from?.username;

  if (!userId || username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can warn members.');
  }

  if (!checkCommandCooldown(userId, 'warn')) {
    return bot.sendMessage(chatId, '⚠️ Please wait before using this command again.');
  }

  const targetUser = match?.[1];
  const reason = match?.[2];

  try {
    await bot.sendMessage(chatId,
      `⚠️ Warning issued to ${targetUser}\n` +
      `Reason: ${reason}`);
  } catch (error) {
    console.error('Error warning user:', error);
    await bot.sendMessage(chatId, '❌ Failed to issue warning.');
  }
});

// Handle ban command
bot.onText(/\/ban (@?\w+) (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id.toString();
  const username = msg.from?.username;

  if (!userId || username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can ban members.');
  }

  if (!checkCommandCooldown(userId, 'ban')) {
    return bot.sendMessage(chatId, '⚠️ Please wait before using this command again.');
  }

  const targetUser = match?.[1];
  const reason = match?.[2];

  try {
    await bot.banChatMember(chatId, targetUser);
    await bot.sendMessage(chatId,
      `🚫 ${targetUser} has been banned\n` +
      `Reason: ${reason}`);
  } catch (error) {
    console.error('Error banning user:', error);
    await bot.sendMessage(chatId,
      '❌ Failed to ban user. Make sure the bot has admin privileges.');
  }
});

// Handle bootfuck command with public shaming
bot.onText(/\/bootfuck (@?\w+)(?: (.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id.toString();
  const username = msg.from?.username;

  if (!userId || username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can bootfuck members.');
  }

  if (!match?.[1]) {
    return bot.sendMessage(chatId, '❌ Please provide a username to bootfuck.\nFormat: /bootfuck @username [reason]');
  }

  const targetUser = match[1].startsWith('@') ? match[1] : `@${match[1]}`;
  const reason = match?.[2] || 'being a clown 🤡';

  try {
    // Generate a random shaming message
    const shamingMessages = [
      `👢 BOOTFUCKED! ${targetUser} just got absolutely demolished! Reason: ${reason}`,
      `🚫 ${targetUser} has been yeeted into the shadow realm! Why? ${reason}`,
      `💀 Rest in pieces ${targetUser}! Got bootfucked for ${reason}`,
      `🎯 ${targetUser} found out what happens when you ${reason}`,
      `🔨 ${targetUser} has been bonked and bootfucked! Next time don't ${reason}`
    ];

    const shamingMessage = shamingMessages[Math.floor(Math.random() * shamingMessages.length)];

    // First send the shaming message
    await bot.sendMessage(chatId, shamingMessage);

    // Then ban the user
    await bot.banChatMember(chatId, targetUser.replace('@', ''));

    // Send a follow-up warning to others
    await bot.sendMessage(chatId,
      `⚠️ Let this be a lesson to everyone else! Don't be like ${targetUser}!`);

  } catch (error) {
    console.error('Error bootfucking user:', error);
    await bot.sendMessage(chatId,
      '❌ Failed to bootfuck user. Make sure the bot has admin privileges.');
  }
});

// Handle admin panel button clicks
bot.on('callback_query', async (query) => {
  if (!query.message || !query.from) return;

  const chatId = query.message.chat.id;
  const userId = query.from.id.toString();
  const username = query.from.username;

  if (username !== 'xGoombas') {
    await bot.answerCallbackQuery(query.id, {
      text: '❌ Only authorized users can use these controls.',
      show_alert: true
    });
    return;
  }

  switch (query.data) {
    case 'admin_mute':
      await bot.sendMessage(chatId,
        'To mute a user:\n/mute @username duration_in_seconds');
      break;
    case 'admin_warn':
      await bot.sendMessage(chatId,
        'To warn a user:\n/warn @username reason');
      break;
    case 'admin_ban':
      await bot.sendMessage(chatId,
        'To ban a user:\n/ban @username reason');
      break;
    case 'admin_bootfuck':
      await bot.sendMessage(chatId,
        'To bootfuck a user:\n/bootfuck @username');
      break;
    case 'admin_broadcast':
      await bot.sendMessage(chatId,
        'To broadcast a message:\n/broadcast Your message here\n' +
        'To send to specific group:\n/group_message GROUP_ID Your message here');
      break;
    case 'admin_recurring':
      const recurringKeyboard = {
        inline_keyboard: [
          [
            { text: '➕ Add Message', callback_data: 'recurring_add' },
            { text: '📋 List Messages', callback_data: 'recurring_list' }
          ],
          [
            { text: '❌ Remove Message', callback_data: 'recurring_remove' }
          ]
        ]
      };
      await bot.editMessageText(
        'Recurring Message Management\n\n' +
        'Select an action:',
        {
          chat_id: chatId,
          message_id: query.message.message_id,
          reply_markup: recurringKeyboard
        }
      );
      break;
    case 'admin_users':
      await bot.sendMessage(chatId, '/pending - View pending verification requests');
      break;
    case 'recurring_add':
      await bot.sendMessage(chatId, 'To add a recurring message:\n/add_recurring_message "schedule" "message"');
      break;
    case 'recurring_list':
      await bot.sendMessage(chatId, '/list_recurring_messages');
      break;
    case 'recurring_remove':
      await bot.sendMessage(chatId, 'To remove a recurring message:\n/remove_recurring_message messageId');
      break;
  }

  await bot.answerCallbackQuery(query.id);
});

// Export bot instance for use in main server
export { bot, handleStart, handleVerify, handleStats, handleRace, handleLeaderboard, handleCallbackQuery };

// Add these new interfaces
interface RecurringMessage {
  message: string;
  schedule: string; // cron expression
  targetGroups: string[];
  enabled: boolean;
}

// Add this new Map to store recurring messages
const recurringMessages = new Map<string, RecurringMessage>();

// Add these new helper functions

// Function to check if a message contains begging
function containsBegging(message: string): boolean {
  return BEGGING_KEYWORDS.some(keyword =>
    message.toLowerCase().includes(keyword.toLowerCase())
  );
}

// Message spam tracking
const messageTracker = new Map<string, { count: number; timestamp: number }>();

// Function to check for spam
function isSpamming(userId: string): boolean {
  const now = Date.now();
  const userMessages = messageTracker.get(userId);

  if (!userMessages) {
    messageTracker.set(userId, { count: 1, timestamp: now });
    return false;
  }

  if (now - userMessages.timestamp > SPAM_DETECTION.TIME_WINDOW) {
    messageTracker.set(userId, { count: 1, timestamp: now });
    return false;
  }

  userMessages.count++;
  if (userMessages.count > SPAM_DETECTION.MAX_MESSAGES) {
    return true;
  }

  return false;
}

// Add recurring message management commands
bot.onText(/\/add_recurring_message (.+) (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const username = msg.from?.username;

  if (username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can manage recurring messages.');
  }

  const schedule = match?.[1]; // cron expression
  const message = match?.[2];

  if (!schedule || !message) {
    return bot.sendMessage(chatId,
      '❌ Please provide both schedule and message.\n' +
      'Format: /add_recurring_message "*/5 * * * *" "Your message here"');
  }

  try {
    const messageId = crypto.randomBytes(8).toString('hex');
    const recurringMessage: RecurringMessage = {
      message,
      schedule,
      targetGroups: ALLOWED_GROUP_IDS,
      enabled: true
    };

    recurringMessages.set(messageId, recurringMessage);

    // Schedule the message
    scheduleJob(schedule, async () => {
      if (recurringMessage.enabled) {
        for (const groupId of recurringMessage.targetGroups) {
          try {
            await bot.sendMessage(groupId, message);
          } catch (error) {
            console.error(`Error sending recurring message to group ${groupId}:`, error);
          }
        }
      }
    });

    return bot.sendMessage(chatId,
      `✅ Recurring message added successfully!\n` +
      `ID: ${messageId}\n` +
      `Schedule: ${schedule}\n` +
      `Target Groups: ${recurringMessage.targetGroups.length}`);
  } catch (error) {
    console.error('Error adding recurring message:', error);
    return bot.sendMessage(chatId, '❌ Error setting up recurring message.');
  }
});

// List recurring messages
bot.onText(/\/list_recurring_messages/, async (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from?.username;

  if (username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can view recurring messages.');
  }

  if (recurringMessages.size === 0) {
    return bot.sendMessage(chatId, '📝 No recurring messages set up.');
  }

  let message = '📋 *Recurring Messages:*\n\n';
  for (const [id, msg] of recurringMessages) {
    message += `ID: \`${id}\`\n` +
      `Schedule: \`${msg.schedule}\`\n` +
      `Status: ${msg.enabled ? '✅' : '❌'}\n` +
      `Groups: ${msg.targetGroups.length}\n` +
      `Message: ${msg.message}\n` +
      `───────────────────\n`;
  }

  return bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// Remove recurring message
bot.onText(/\/remove_recurring_message (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const username = msg.from?.username;

  if (username !== 'xGoombas') {
    return bot.sendMessage(chatId, '❌ Only authorized users can remove recurring messages.');
  }

  const messageId = match?.[1];
  if (!messageId) {
    return bot.sendMessage(chatId, '❌ Please provide the message ID to remove.');
  }

  if (recurringMessages.delete(messageId)) {
    return bot.sendMessage(chatId, '✅ Recurring message removed successfully!');
  } else {
    return bot.sendMessage(chatId, '❌ Message not found.');
  }
});

// Add more sophisticated AI conversation patterns
const CONVERSATION_PATTERNS = {
  STATS: {
    triggers: ['stats', 'wager', 'numbers', 'earnings'],
    responses: [
      "Hey there! Want to see your stats? Just use /stats - make sure you're verified first! 👀",
      "I can help with that! Use /stats to check your numbers. Need to verify first? Just let me know! 📊",
      "Easy peasy! Get verified and use /stats to see all your juicy stats! 🎯"
    ]
  },
  LEADERBOARD: {
    triggers: ['leaderboard', 'race', 'winning', 'leader', 'top'],
    responses: [
      "Let me check who's crushing it right now! 🏆",
      "Want to see who's in the lead? I'll fetch that for you! 🎮",
      "Race standings coming right up! Let's see who's on top! 🚀"
    ]
  },
  VERIFICATION: {
    triggers: ['verify', 'verification', 'how to verify', 'get verified'],
    responses: [
      "Getting verified is easy! Just use /verify followed by your Goated username. Need help? @xGoombas is your guy! 🔐",
      "Want to get verified? Use /verify [your Goated username] and we'll get you set up! 👍",
      "Verification is your key to all the features! Use /verify with your username to get started! ✨"
    ]
  },
  SHARING: {
    triggers: ['airdrop', 'giving away', 'sharing', 'giveaway'],
    responses: [
      "Now that's the spirit! Love seeing the community support! 🎁",
      "You're what makes this community great! Keep it up! 🌟",
      "Sharing is caring! This is what GoatedVIPs is all about! 💫"
    ]
  },
  BEGGING: {
    triggers: ['give me', 'need money', 'spare some', 'broke'],
    responses: [
      "Hey, let's keep it classy! No begging in our community. 🚫",
      "Sorry, begging isn't allowed here. Why not participate in our races instead? 🏁",
      "Begging isn't cool! Join our races and competitions to earn rewards! 💪"
    ]
  }
};

// Add anti-spam and anti-begging handler
bot.on('message', async (msg) => {
  if (!msg.text || !msg.from || msg.chat.type === 'private') return;

  const userId = msg.from.id.toString();
  const chatId = msg.chat.id;
  const messageText = msg.text;

  // Check for spam
  if (isSpamming(userId)) {
    try {
      await bot.restrictChatMember(chatId, userId, {
        until_date: Math.floor(Date.now() / 1000) + SPAM_DETECTION.MUTE_DURATION,
        permissions: {
          can_send_messages: false,
          can_send_media_messages: false,
          can_send_other_messages: false,
          can_add_web_page_previews: false
        }
      });

      await bot.sendMessage(chatId,
        `⚠️ @${msg.from.username} has been muted for ${SPAM_DETECTION.MUTE_DURATION / 60} minutes due to spamming.`);
    } catch (error) {
      console.error('Error muting spammer:', error);
    }
    return;
  }

  // Check for begging
  if (containsBegging(messageText)) {
    try {
      await bot.deleteMessage(chatId, msg.message_id.toString());
      await bot.sendMessage(chatId,
        `⚠️ @${msg.from.username} begging is not allowed in this group.`);
    } catch (error) {
      console.error('Error handling begging message:', error);
    }
  }
});

// Improved conversation handler
bot.on('message', async (msg) => {
  // Skip if no text or not a mention of the bot
  if (!msg.text || !msg.entities?.some(entity =>
    entity.type === 'mention' &&
    msg.text.slice(entity.offset, entity.offset + entity.length).toLowerCase() === '@goatedvipsbot'
  )) return;

  const chatId = msg.chat.id;
  const userId = msg.from?.id.toString();
  const messageText = msg.text.toLowerCase();

  try {
    // Check rate limits and cooldowns
    if (!userId || !canRespond(userId)) return;

    // Log incoming message for debugging
    console.log(`[AI Conversation] Received message from ${userId}: ${messageText}`);

    // Extract the question (remove the bot mention)
    const question = messageText.replace(/@goatedvipsbot/i, '').trim();

    // Handle different conversation patterns
    let response: string | null = null;

    // Check for stats/wager related questions
    if (CONVERSATION_PATTERNS.STATS.triggers.some(trigger => question.includes(trigger))) {
      const randomResponse = CONVERSATION_PATTERNS.STATS.responses[
        Math.floor(Math.random() * CONVERSATION_PATTERNS.STATS.responses.length)
      ];
      response = randomResponse;
    }
    // Check for leaderboard/race related questions
    else if (CONVERSATION_PATTERNS.LEADERBOARD.triggers.some(trigger => question.includes(trigger))) {
      try {
        const apiResponse = await fetch(
          `http://0.0.0.0:5000/api/affiliate/stats`,
          {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          }
        );

        if (!apiResponse.ok) throw new Error('Failed to fetch leaderboard data');

        const data = await apiResponse.json();
        const topUser = data?.data?.monthly?.data?.[0];

        if (topUser) {
          response = `${CONVERSATION_PATTERNS.LEADERBOARD.responses[
            Math.floor(Math.random() * CONVERSATION_PATTERNS.LEADERBOARD.responses.length)
          ]}\n\n🥇 ${topUser.name} is leading with $${topUser.wagered.this_month.toLocaleString()} wagered this month!`;
        } else {
          response = "Hmm, looks like I'm having trouble getting the latest race data. Try /leaderboard for the full standings! 🏁";
        }
      } catch (error) {
        console.error('[AI Conversation] Error fetching leaderboard:', error);
        response = "Sorry, I couldn't fetch the race data right now. Use /leaderboard to check the standings! 🏁";
      }
    }
    // Handle verification questions
    else if (CONVERSATION_PATTERNS.VERIFICATION.triggers.some(trigger => question.includes(trigger))) {
      response = CONVERSATION_PATTERNS.VERIFICATION.responses[
        Math.floor(Math.random() * CONVERSATION_PATTERNS.VERIFICATION.responses.length)
      ];
    }
    // Respond to sharing/giveaways positively
    else if (CONVERSATION_PATTERNS.SHARING.triggers.some(trigger => question.includes(trigger))) {
      response = CONVERSATION_PATTERNS.SHARING.responses[
        Math.floor(Math.random() * CONVERSATION_PATTERNS.SHARING.responses.length)
      ];
    }
    // Handle begging attempts
    else if (CONVERSATION_PATTERNS.BEGGING.triggers.some(trigger => question.includes(trigger))) {
      response = CONVERSATION_PATTERNS.BEGGING.responses[
        Math.floor(Math.random() * CONVERSATION_PATTERNS.BEGGING.responses.length)
      ];
    }

    // Send response if we have one
    if (response) {
      await bot.sendMessage(chatId, response);
      console.log(`[AI Conversation] Sent response to ${userId}: ${response}`);
    }

  } catch (error) {
    console.error('[AI Conversation] Error handling message:', error);
  }
});

// Export bot instance and testing utilities
export default bot;

export const __testing = {
  CONVERSATION_PATTERNS,
  canRespond
};