import { z } from "zod";
import type { Express } from "express";
import TelegramBot from "node-telegram-bot-api";
import { db } from "@db";
import { telegramUsers, verificationRequests } from "@db/schema/telegram";
import { users } from "@db/schema/users";
import { eq } from "drizzle-orm";
import { logError, logAction } from "./utils/logger";
import { RateLimiterMemory } from "rate-limiter-flexible";

// Custom emojis for consistent branding
const CUSTOM_EMOJIS = {
  error: "❌",
  success: "✅",
  vip: "👑",
  stats: "📊",
  race: "🏃",
  play: "🎮",
  bonus: "🎁",
  challenge: "🎯",
  verify: "✨",
  refresh: "🔄"
};

// Inline keyboard markup creators
const createLeaderboardButtons = () => ({
  inline_keyboard: [
    [
      { text: `${CUSTOM_EMOJIS.refresh} Refresh`, callback_data: 'refresh_leaderboard' },
      { text: `${CUSTOM_EMOJIS.stats} My Stats`, callback_data: 'view_stats' }
    ]
  ]
});

const createVerificationButtons = (username: string) => ({
  inline_keyboard: [
    [
      { text: `${CUSTOM_EMOJIS.success} Approve`, callback_data: `approve_${username}` },
      { text: `${CUSTOM_EMOJIS.error} Reject`, callback_data: `reject_${username}` }
    ]
  ]
});

// Updated command list
const BOT_COMMANDS = [
  { command: 'start', description: '🚀 Start using the bot' },
  { command: 'verify', description: '🔐 Link your Goated account' },
  { command: 'stats', description: '📊 Check your wager stats' },
  { command: 'race', description: '🏁 View your race position' },
  { command: 'leaderboard', description: '🏆 See top players' },
  { command: 'play', description: '🎮 Play on Goated with our affiliate link' },
  { command: 'website', description: '🌐 Visit GoatedVIPs.gg' },
  { command: 'help', description: '❓ Get help using the bot' }
];

// Admin-only commands
const ADMIN_COMMANDS = [
  { command: 'pending', description: '📝 View pending verifications' },
  { command: 'broadcast', description: '📢 Send announcement to all users' },
  { command: 'approve', description: '✅ Approve a verification request' },
  { command: 'reject', description: '❌ Reject a verification request' }
];

// Updated message templates
const MESSAGES = {
  welcome: `
${CUSTOM_EMOJIS.vip} *Welcome to GoatedVIPs Bot*

Your gateway to exclusive VIP benefits and rewards!

${CUSTOM_EMOJIS.verify} Use /verify to link your account
${CUSTOM_EMOJIS.stats} Check /stats for your gaming stats
${CUSTOM_EMOJIS.race} View /race for leaderboard
${CUSTOM_EMOJIS.bonus} Get /bonuscodes for latest bonuses
${CUSTOM_EMOJIS.challenge} Join /challenges for extra rewards

Type /help for all available commands
`.trim(),

  help: (isAdmin: boolean) => `
${CUSTOM_EMOJIS.vip} *Available Commands*

📱 *User Commands:*
• /verify - Link your account
• /stats - View your statistics
• /race - Race leaderboard
• /leaderboard - Monthly Leaderboard
• /play - Game with affiliate
• /website - Platform website
• /help - Show this help message

${isAdmin ? `
${CUSTOM_EMOJIS.vip} *Admin Commands:*
• /pending - View verification requests
• /approve <username> - Approve user
• /reject <username> - Reject user
• /broadcast - Send announcements` : ''}

Need help? Contact @xGoombas
`.trim(),

  verifyInstructions: `
🔐 *Account Verification*

Use: /verify YourGoatedUsername
Your username must match your account on Goated.com

An admin will review your request shortly.
  `.trim(),

  verificationSubmitted: `
✅ *Verification Request Submitted*

Your request will be reviewed by an admin.
You'll receive a notification once verified.

While waiting:
• Check /help for available commands
• Use /website to visit our platform
  `.trim(),
  stats: (user: any) => `
${CUSTOM_EMOJIS.stats} *Your Stats*

• Username: ${user.username}
• Verified: ${user.isVerified ? CUSTOM_EMOJIS.success : CUSTOM_EMOJIS.error}
• Notifications: ${user.notificationsEnabled ? '🔔' : '🔕'}
${user.verifiedAt ? `• Member since: ${new Date(user.verifiedAt).toLocaleDateString()}` : ''}
`.trim(),
  website: `
${CUSTOM_EMOJIS.vip} *Official Website*

Visit our platform: https://goatedvips.gg
`.trim(),
  play: `
${CUSTOM_EMOJIS.play} *Play Now*

Join through our link:
https://www.Goated.com/r/GOATEDVIPS
`.trim(),
  race: (user: any, participants: any[]) => {
    const userPosition = participants.findIndex(p => p.uid === user.userId) + 1;
    const userStats = participants.find(p => p.uid === user.userId);

    return `
${CUSTOM_EMOJIS.race} *Your Monthly Race Status*

Position: #${userPosition || 'Not participating'}
${userStats ? `Wagered: $${userStats.wagered.toFixed(2)}` : 'Start playing to join the race!'}

🏆 Prize Pool: $500
⏰ Updated: ${new Date().toLocaleString()}
`.trim();
  },
  leaderboard: async (participants: any[]) => {
    // Get all verified telegram users for mapping
    const verifiedUsers = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.isVerified, true));

    // Create a mapping of userId to telegram username
    const userIdToTelegramMap = new Map(
      verifiedUsers.map(user => [user.userId, user.telegramUsername])
    );

    const top10 = participants.slice(0, 10);
    return `
${CUSTOM_EMOJIS.vip} *Monthly Race Leaderboard*
🏆 *Prize Pool: $500*

${top10.map((p, i) => {
      const telegramUsername = userIdToTelegramMap.get(p.uid);
      const displayName = telegramUsername ? `@${telegramUsername}` : p.name;
      return `${i + 1}. ${displayName}: $${p.wagered.toFixed(2)}`;
    }).join('\n')}

⏰ Updated: ${new Date().toLocaleString()}
`.trim();
  },
  pendingRequests: (requests: any[]) => {
    if (requests.length === 0) {
      return '✅ No pending verification requests.';
    }

    return `📝 *Pending Verification Requests*\n\n${
      requests.map((req, index) =>
        `${index + 1}. @${req.telegramUsername}\n` +
        `   • Goated Username: ${req.goatedUsername}\n` +
        `   • Requested: ${new Date(req.requestedAt).toLocaleString()}\n`
      ).join('\n')
    }`;
  },
  broadcastPrompt: `
${CUSTOM_EMOJIS.vip} *Send Broadcast Message*

To send a message to all verified users:
1. Use: /broadcast Your Message
2. Example: /broadcast New bonus codes available!

Your message will be sent to all verified users.
`.trim(),
  broadcastSent: (count: number) => `
${CUSTOM_EMOJIS.success} Broadcast sent successfully to ${count} users.
`.trim(),
};

const rateLimiter = new RateLimiterMemory({
  points: 20,
  duration: 60
});

let botInstance: TelegramBot | null = null;

function log(level: "error" | "info" | "debug", message: string) {
  console.log(`[${level.toUpperCase()}] ${message}`);
}

// Update the initializeBot function to handle admin command setup more gracefully
async function initializeBot(): Promise<TelegramBot | null> {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    log("error", "TELEGRAM_BOT_TOKEN is not set!");
    return null;
  }

  try {
    const options: TelegramBot.ConstructorOptions = {
      polling: true // Always use polling for now since we don't have a webhook URL
    };

    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, options);
    botInstance = bot;

    // Set commands for regular users first
    try {
      await bot.setMyCommands(BOT_COMMANDS);
      log("info", "Set basic commands successfully");
    } catch (error) {
      log("error", `Error setting basic commands: ${error}`);
    }

    // Set admin commands for admin users
    try {
      const admins = await db
        .select()
        .from(users)
        .where(eq(users.isAdmin, true));

      for (const admin of admins) {
        if (!admin.telegramId) continue;
        
        try {
          // First check if the chat exists
          await bot.getChat(parseInt(admin.telegramId));
          
          await bot.setMyCommands([...BOT_COMMANDS, ...ADMIN_COMMANDS], {
            scope: {
              type: 'chat',
              chat_id: parseInt(admin.telegramId)
            }
          });
          log("info", `Set admin commands for ${admin.telegramId}`);
        } catch (cmdError) {
          if (cmdError.message.includes('chat not found')) {
            log("info", `Admin ${admin.telegramId} hasn't started a chat with the bot yet`);
          } else {
            log("error", `Failed to set admin commands for ${admin.telegramId}: ${cmdError}`);
          }
        }
      }
    } catch (adminError) {
      log("error", `Error setting admin commands: ${adminError}`);
    }

    registerEventHandlers(bot);

    const botInfo = await bot.getMe();
    log("info", `Bot initialized successfully as @${botInfo.username}`);

    return bot;
  } catch (error) {
    log("error", `Bot initialization error: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function registerEventHandlers(bot: TelegramBot) {
  bot.onText(/\/start/, handleStart);
  bot.onText(/\/help/, handleHelp);
  bot.onText(/\/verify (.+)/, (msg, match) => handleVerify(msg, match ? match[1] : undefined));
  bot.onText(/\/verify$/, (msg) => handleVerify(msg));
  bot.onText(/\/stats/, handleStats);
  bot.onText(/\/race/, handleRace);
  bot.onText(/\/bonuscodes/, handleBonusCodes);
  bot.onText(/\/challenges/, handleChallenges);
  bot.onText(/\/website/, handleWebsite);
  bot.onText(/\/play/, handlePlay);
  bot.onText(/\/pending/, handlePending);
  bot.onText(/\/leaderboard/, handleLeaderboard);

  // Admin commands
  bot.onText(/\/broadcast$/, handleBroadcastPrompt);
  bot.onText(/\/broadcast (.+)/, (msg, match) => handleBroadcast(msg, match ? match[1] : undefined));
  bot.onText(/\/approve (.+)/, (msg, match) => handleApprove(msg, match ? match[1] : undefined));
  bot.onText(/\/reject (.+)/, (msg, match) => handleReject(msg, match ? match[1] : undefined));

  bot.on("message", async (msg) => {
    if (!msg.text || !msg.from?.id) return;
    try {
      await rateLimiter.consume(msg.from.id.toString());
    } catch {
      await safeSendMessage(msg.chat.id, "⚠️ Please wait before sending more commands.");
    }
  });

  // Add callback query handler for buttons
  bot.on('callback_query', handleCallbackQuery);
}

// Handler implementations
async function handleStart(msg: TelegramBot.Message) {
  await safeSendMessage(msg.chat.id, MESSAGES.welcome, { parse_mode: "Markdown" });
}

async function handleHelp(msg: TelegramBot.Message) {
  const isAdmin = await checkIsAdmin(msg.from?.id?.toString());
  await safeSendMessage(msg.chat.id, MESSAGES.help(isAdmin), { parse_mode: "Markdown" });
}

async function handleWebsite(msg: TelegramBot.Message) {
  await safeSendMessage(msg.chat.id, MESSAGES.website, { parse_mode: "Markdown" });
}

async function handlePlay(msg: TelegramBot.Message) {
  await safeSendMessage(msg.chat.id, MESSAGES.play, { parse_mode: "Markdown" });
}


async function handleVerify(msg: TelegramBot.Message, username?: string) {
  if (!msg.from?.id) return;

  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();

  // If in group chat, direct to private chat
  if (msg.chat.type !== 'private') {
    return bot.sendMessage(
      chatId,
      'Please start a private chat with me to complete verification:\n' +
      'https://t.me/GoatedVIPsBot?start=verify'
    );
  }

  if (!username) {
    return bot.sendMessage(chatId, MESSAGES.verifyInstructions, {
      parse_mode: "Markdown"
    });
  }

  try {
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

    // Check if the Goated username exists in our database
    const goatedUser = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!goatedUser[0]) {
      return bot.sendMessage(chatId,
        '❌ This username was not found in our system. Please make sure you\'ve entered your correct Goated username.');
    }

    // Create verification request
    await db.insert(verificationRequests).values({
      telegramId: telegramId,
      telegramUsername: msg.from.username || 'unknown',
      goatedUsername: username,
      status: 'pending',
      requestedAt: new Date()
    });

    await bot.sendMessage(chatId, MESSAGES.verificationSubmitted, {
      parse_mode: "Markdown"
    });

    // Notify admins with inline buttons
    const admins = await db
      .select()
      .from(users)
      .where(eq(users.isAdmin, true));

    for (const admin of admins) {
      if (!admin.telegramId) continue;
      const message = `📝 *New Verification Request*\n\n` +
        `From: @${msg.from.username}\n` +
        `Goated Username: ${username}\n` +
        `Requested: ${new Date().toLocaleString()}`;

      await bot.sendMessage(admin.telegramId, message, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Approve', callback_data: `approve_${msg.from.username}` },
              { text: '❌ Reject', callback_data: `reject_${msg.from.username}` }
            ]
          ]
        }
      });
    }
  } catch (error) {
    console.error('Verification error:', error);
    await bot.sendMessage(chatId, '❌ Error submitting request. Please try again later.');
  }
}

async function handleRace(msg: TelegramBot.Message) {
  if (!msg.from?.id) return;

  try {
    const user = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramId, msg.from.id.toString()))
      .limit(1);

    if (!user[0]) {
      return safeSendMessage(msg.chat.id, "❌ Please verify your account first using /verify");
    }

    const response = await fetch(`${process.env.INTERNAL_API_URL}/api/wager-races/current`);
    if (!response.ok) {
      throw new Error(`Failed to fetch race data: ${response.status}`);
    }

    const data = await response.json();
    await safeSendMessage(msg.chat.id, MESSAGES.race(user[0], data.participants), { parse_mode: "Markdown" });
  } catch (error) {
    log("error", `Race data error: ${error instanceof Error ? error.message : String(error)}`);
    await safeSendMessage(msg.chat.id, "❌ Error fetching race data. Please try again later.");
  }
}

async function handleChallenges(msg: TelegramBot.Message) {
  await safeSendMessage(msg.chat.id, "🎯 No active challenges at the moment. Check back soon!", { parse_mode: "Markdown" });
}

async function handleBonusCodes(msg: TelegramBot.Message) {
  await safeSendMessage(msg.chat.id, "🎁 Bonus codes coming soon!", { parse_mode: "Markdown" });
}

async function handleStats(msg: TelegramBot.Message) {
  if (!msg.from?.id) return;

  try {
    const user = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramId, msg.from.id.toString()))
      .limit(1);

    if (!user[0]) {
      return safeSendMessage(msg.chat.id, "❌ Please verify your account first using /verify");
    }

    await safeSendMessage(msg.chat.id, MESSAGES.stats(user[0]), { parse_mode: "Markdown" });
  } catch (error) {
    log("error", `Error fetching stats: ${error instanceof Error ? error.message : String(error)}`);
    await safeSendMessage(msg.chat.id, "❌ Error fetching your statistics.");
  }
}

async function handleLeaderboardRefresh(chatId: number, messageId: number) {
  const response = await fetch(`${process.env.INTERNAL_API_URL}/api/wager-races/current`);
  if (!response.ok) {
    throw new Error(`Failed to fetch race data: ${response.status}`);
  }
  const data = await response.json();
  const leaderboardMessage = await MESSAGES.leaderboard(data.participants);

  if (botInstance) {
    await botInstance.editMessageText(leaderboardMessage, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: createLeaderboardButtons()
    });
  }
}

// Fix the verificationRequests schema usage
const verificationSchema = z.object({
  id: z.number(),
  userId: z.number(),
  status: z.string().nullable(),
  updatedAt: z.date().nullable(),
  verifiedAt: z.date().nullable(),
  verifiedBy: z.string().nullable(),
  telegramId: z.string(),
  telegramUsername: z.string(),
  requestedAt: z.date(),
  adminNotes: z.string().nullable()
});

// Update handlePending to use the schema
async function handlePending(msg: TelegramBot.Message) {
  if (!botInstance || !msg.from?.id) return;

  try {
    const isAdmin = await checkIsAdmin(msg.from.id.toString());
    if (!isAdmin) {
      return safeSendMessage(msg.chat.id, "❌ This command is for admins only.");
    }

    const pending = await db
      .select()
      .from(verificationRequests)
      .where(eq(verificationRequests.status, 'pending'));

    // Send each pending request as a separate message with buttons
    if (pending.length === 0) {
      await safeSendMessage(msg.chat.id, `${CUSTOM_EMOJIS.success} No pending verification requests.`);
      return;
    }

    for (const request of pending) {
      const parsedRequest = verificationSchema.parse(request);
      const message = `${CUSTOM_EMOJIS.verify} *Verification Request*\n\n` +
        `From: @${parsedRequest.telegramUsername}\n` +
        `User ID: ${parsedRequest.userId}\n` +
        `Requested: ${parsedRequest.requestedAt.toLocaleString()}\n` +
        `Status: ${parsedRequest.status}`;

      await safeSendMessage(msg.chat.id, message, {
        parse_mode: "Markdown",
        reply_markup: createVerificationButtons(parsedRequest.telegramUsername)
      });
    }
  } catch (error) {
    log("error", `Error listing pending requests: ${error instanceof Error ? error.message : String(error)}`);
    await safeSendMessage(msg.chat.id, "❌ Error fetching pending requests.");
  }
}

// Update the verified by field to be string in handleApprove
async function handleApprove(msg: TelegramBot.Message, username?: string) {
  if (!botInstance || !msg.from?.id) return;

  try {
    const isAdmin = await checkIsAdmin(msg.from.id.toString());
    if (!isAdmin) {
      return safeSendMessage(msg.chat.id, "❌ This command is for admins only.");
    }

    if (!username) {
      return safeSendMessage(msg.chat.id, "❌ Please provide a username to approve.");
    }

    const request = await db
      .select()
      .from(verificationRequests)
      .where(eq(verificationRequests.telegramUsername, username))
      .limit(1);

    if (!request[0]) {
      return safeSendMessage(msg.chat.id, "❌ Request not found");
    }

    const admin = await db
      .select()
      .from(users)
      .where(eq(users.telegramId, msg.from.id.toString()))
      .limit(1);

    if (!admin[0]) {
      return safeSendMessage(msg.chat.id, "❌ Admin record not found");
    }

    // Update verification request status with string ID
    await db
      .update(verificationRequests)
      .set({
        status: 'approved',
        verifiedAt: new Date(),
        verifiedBy: admin[0].id.toString(),
        adminNotes: `Approved by @${msg.from.username}`
      })
      .where(eq(verificationRequests.telegramUsername, username));

    // Create or update telegram user record
    await db
      .insert(telegramUsers)
      .values({
        telegramId: request[0].telegramId,
        telegramUsername: request[0].telegramUsername,
        userId: request[0].userId,
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: admin[0].id.toString(),
        notificationsEnabled: true
      });

    // Update user record with telegram ID
    await db
      .update(users)
      .set({
        telegramId: request[0].telegramId
      })
      .where(eq(users.id, request[0].userId));

    await safeSendMessage(msg.chat.id, `✅ Approved @${username}`);

    // Send welcome message to the user
    const welcomeMsg = `${CUSTOM_EMOJIS.success} *Verification Successful!*\n\n` +
      `Your account has been verified and linked. Welcome to Goated!\n\n` +
      `${CUSTOM_EMOJIS.stats} Check /stats for your gaming stats\n` +
      `${CUSTOM_EMOJIS.race} View /race for leaderboard position\n` +
      `${CUSTOM_EMOJIS.bonus} Get /bonuscodes for latest bonuses\n\n` +
      `Type /help to see all available commands`;

    await safeSendMessage(parseInt(request[0].telegramId), welcomeMsg, {
      parse_mode: "Markdown"
    });
  } catch (error) {
    log("error", `Error approving user: ${error instanceof Error ? error.message : String(error)}`);
    await safeSendMessage(msg.chat.id, "❌ Error approving user");
  }
}

async function handleReject(msg: TelegramBot.Message, username?: string) {
  if (!botInstance) return;

  try {
    const admin = await db
      .select()
      .from(users)
      .where(eq(users.telegramId, msg.from!.id.toString()))
      .limit(1);

    if (!admin[0]?.isAdmin) {
      return safeSendMessage(msg.chat.id, "❌ This command is for admins only.");
    }

    if (!username) {
      return safeSendMessage(msg.chat.id, "❌ Please provide a username to reject.");
    }

    const request = await db
      .select()
      .from(verificationRequests)
      .where(eq(verificationRequests.telegramUsername, username))
      .limit(1);

    if (!request[0]) {
      return safeSendMessage(msg.chat.id, "❌ Request not found");
    }

    await db
      .update(verificationRequests)
      .set({
        status: 'rejected',
        verifiedAt: new Date(),
        verifiedBy: admin[0].id.toString()
      })
      .where(eq(verificationRequests.telegramUsername, username));

    await safeSendMessage(msg.chat.id, `❌ Rejected @${username}`);
    await safeSendMessage(parseInt(request[0].telegramId), "❌ Your verification request was rejected. Please ensure you provided the correct Goated username and try again with /verify.");
  } catch (error) {
    log("error", `Error rejecting user: ${error instanceof Error ? error.message : String(error)}`);
    await safeSendMessage(msg.chat.id, "❌ Error rejecting user");
  }
}

async function handleBroadcastPrompt(msg: TelegramBot.Message) {
  const isAdmin = await checkIsAdmin(msg.from?.id?.toString());
  if (!isAdmin) {
    return safeSendMessage(msg.chat.id, "❌ This command is for admins only.");
  }

  await safeSendMessage(msg.chat.id, MESSAGES.broadcastPrompt, { parse_mode: "Markdown" });
}

async function handleBroadcast(msg: TelegramBot.Message, message?: string) {
  if (!botInstance) return;

  try {
    const isAdmin = await checkIsAdmin(msg.from?.id?.toString());
    if (!isAdmin) {
      return safeSendMessage(msg.chat.id, "❌ This command is for admins only.");
    }

    if (!message) {
      return safeSendMessage(msg.chat.id, MESSAGES.broadcastPrompt, { parse_mode: "Markdown" });
    }

    const verifiedUsers = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.isVerified, true));

    let sentCount = 0;
    for (const user of verifiedUsers) {
      try {
        await safeSendMessage(parseInt(user.telegramId), message, { parse_mode: "Markdown" });
        sentCount++;
      } catch (error) {
        log("error", `Failed to send broadcast to user ${user.telegramId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    await safeSendMessage(msg.chat.id, MESSAGES.broadcastSent(sentCount), { parse_mode: "Markdown" });
    log("info", `Broadcast sent to ${sentCount} users by admin ${msg.from?.username}`);
  } catch (error) {
    log("error", `Broadcast error: ${error instanceof Error ? error.message : String(error)}`);
    await safeSendMessage(msg.chat.id, "❌ Error sending broadcast message.");
  }
}

// Utility functions
async function safeSendMessage(chatId: number, text: string, options: any = {}) {
  if (!botInstance) return;
  try {
    await botInstance.sendMessage(chatId, text, options);
  } catch (error) {
    log("error", `Failed to send message: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function checkIsAdmin(telegramId?: string): Promise<boolean> {
  if (!telegramId) return false;
  try {
    const admin = await db
      .select()
      .from(users)
      .where(eq(users.telegramId, telegramId))
      .limit(1);
    return !!admin[0]?.isAdmin;
  } catch {
    return false;
  }
}

async function handleLeaderboard(msg: TelegramBot.Message) {
  try {
    const response = await fetch(`${process.env.INTERNAL_API_URL}/api/wager-races/current`);
    if (!response.ok) {
      throw new Error(`Failed to fetch race data: ${response.status}`);
    }

    const data = await response.json();
    const leaderboardMessage = await MESSAGES.leaderboard(data.participants);

    await safeSendMessage(msg.chat.id, leaderboardMessage, {
      parse_mode: "Markdown",
      reply_markup: createLeaderboardButtons()
    });
  } catch (error) {
    log("error", `Leaderboard error: ${error instanceof Error ? error.message : String(error)}`);
    await safeSendMessage(msg.chat.id, "❌ Error fetching leaderboard data. Please try again later.");
  }
}

async function handleCallbackQuery(callbackQuery: TelegramBot.CallbackQuery) {
  const chatId = callbackQuery.message?.chat.id;
  const messageId = callbackQuery.message?.message_id;
  const data = callbackQuery.data;

  if (!chatId || !messageId || !data) return;

  if (data.startsWith('approve_') || data.startsWith('reject_')) {
    const [action, username] = data.split('_');
    const isAdmin = await checkIsAdmin(callbackQuery.from.id.toString());

    if (!isAdmin) {
      return bot.answerCallbackQuery(callbackQuery.id, {
        text: '❌ Only admins can perform this action',
        show_alert: true
      });
    }

    if (action === 'approve') {
      await handleApprove({ chat_id: chatId, from: callbackQuery.from }, username);
    } else {
      await handleReject({ chat_id: chatId, from: callbackQuery.from }, username);
    }

    await bot.answerCallbackQuery(callbackQuery.id);
    await bot.deleteMessage(chatId, messageId);
  }
}


export { initializeBot };
export default initializeBot;