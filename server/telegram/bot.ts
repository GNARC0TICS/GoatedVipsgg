import { z } from "zod";
import type { Express } from "express";
import TelegramBot from "node-telegram-bot-api";
import { db } from "@db";
import { telegramUsers, verificationRequests } from "@db/schema/telegram";
import { users } from "@db/schema/users";
import { eq } from "drizzle-orm";
import { log, logError, logAction } from "./utils/logger";
import { RateLimiterMemory } from "rate-limiter-flexible";
import type { InlineQueryResult } from "node-telegram-bot-api";

const CUSTOM_EMOJIS = {
  logo: "🐐",
  welcome: "✨",
  stats: "📊",
  leaderboard: "🏆",
  play: "🎲",
  race: "🏃",
  banned: "⛔",
  admin: "👑",
  error: "❌",
  success: "✅",
  mvp: "🌟",
  live: "🔴",
  bonus: "🎁",
  vip: "💎",
  challenge: "🎯",
  link: "🔗",
  wallet: "💰",
  time: "⏰",
  support: "💬",
  settings: "⚙️",
  alert: "🔔",
  rocket: "🚀",
  fire: "🔥",
  trophy: "🏆",
  gift: "🎁"
};

const rateLimiter = new RateLimiterMemory({
  points: 20,
  duration: 60,
});

const BOT_COMMANDS = [
  { command: '/start', description: 'Start the bot and see welcome message' },
  { command: '/help', description: 'Show available commands' },
  { command: '/verify', description: 'Link your Goated account' },
  { command: '/menu', description: 'Show main menu with quick links' },
  { command: '/status', description: 'Check your verification status' },
  { command: '/bonuscodes', description: 'Get latest bonus codes (verified users)' },
  { command: '/notifications', description: 'Toggle notifications' },
  { command: '/pending', description: 'View pending verification requests (admins)' },
  { command: '/stats', description: 'View platform statistics (admins)' }
];

const MESSAGES = {
  welcome: `
${CUSTOM_EMOJIS.logo} *Welcome to the VIP Bot!*

Your gateway to exclusive rewards and VIP benefits!

🌟 *VIP Features:*
• ${CUSTOM_EMOJIS.stats} Real-time stats tracking
• ${CUSTOM_EMOJIS.leaderboard} Exclusive tournaments
• ${CUSTOM_EMOJIS.play} Special promotions
• ${CUSTOM_EMOJIS.mvp} Priority support
• ${CUSTOM_EMOJIS.race} Enhanced rewards

🎮 *Available Commands:*
• Type /verify to link your account
• Use /menu to see quick links
• Check /status for your VIP level

${CUSTOM_EMOJIS.live} *Join the Community:*
• Daily races and challenges
• VIP-only events
• Special member perks

Ready to join the elite? Use /verify to get started!
`.trim(),

  menu: `
${CUSTOM_EMOJIS.logo} *Quick Links*

${CUSTOM_EMOJIS.play} *Gaming:*
• [Play Now](https://www.Goated.com/play)
• [Tournaments](https://www.Goated.com/tournaments)
• [Challenges](https://www.Goated.com/challenges)

${CUSTOM_EMOJIS.stats} *Account:*
• [VIP Status](https://www.Goated.com/vip)
• [Rewards](https://www.Goated.com/rewards)
• [Profile](https://www.Goated.com/profile)

${CUSTOM_EMOJIS.leaderboard} *Community:*
• [Leaderboard](https://www.Goated.com/leaderboard)
• [Race Stats](https://www.Goated.com/races)
• [Rankings](https://www.Goated.com/rankings)
`.trim(),

  help: (isAdmin: boolean) => `
${CUSTOM_EMOJIS.logo} *VIP Bot Commands*

📱 *General Commands:*
• /start - Get started
• /help - Show this menu
• /verify - Link your account
• /menu - Quick links
• /status - Check VIP status
• /notifications - Toggle alerts
• /bonuscodes - Get bonus codes

${isAdmin ? `
${CUSTOM_EMOJIS.admin} *Admin Commands:*
• /pending - View verifications
• /stats - Platform statistics
• /broadcast - Send announcements` : ''}

Need help? Contact @xGoombas
`.trim(),

  verifyInstructions: `
${CUSTOM_EMOJIS.logo} *Account Verification*

To verify your account:
1️⃣ Type: /verify YourUsername
2️⃣ Example: /verify JohnDoe123

*Note:* Make sure to use your exact username
`.trim(),

  verificationSubmitted: `
${CUSTOM_EMOJIS.success} *Verification Request Submitted!*

Your request has been received and will be processed shortly.
You'll receive a notification once verified.

${CUSTOM_EMOJIS.mvp} While waiting:
• Check out /help for available commands
• Join our VIP community: @GoatedVIP
• Use /menu to explore features
`.trim(),

  status: (user: any) => `
${CUSTOM_EMOJIS.success} *Account Status:*
• Telegram: @${user.telegramUsername}
• User ID: ${user.userId}
• Verified: ${user.isVerified ? `${CUSTOM_EMOJIS.success}` : `${CUSTOM_EMOJIS.error}`}
• Notifications: ${user.notificationsEnabled ? '🔔' : '🔕'}
${user.verifiedAt ? `• Verified On: ${new Date(user.verifiedAt).toLocaleDateString()}` : ''}
`.trim(),

  bonusCodes: `${CUSTOM_EMOJIS.mvp} *Latest Bonus Codes:*\n\nVIPBOOST - New user promotion\n\nMore codes coming soon!`,

  pendingRequests: (requests: any[]) => requests.map((request: any) =>
    `${CUSTOM_EMOJIS.admin} Verification Request:\nTelegram: @${request.telegramUsername}\nID: ${request.userId}`
  ).join('\n\n'),

  stats: (verifiedUsers: number, pendingRequests: number) => `
${CUSTOM_EMOJIS.stats} *Platform Statistics:*

${CUSTOM_EMOJIS.mvp} Verified Users: ${verifiedUsers}
${CUSTOM_EMOJIS.play} Pending Requests: ${pendingRequests}
`.trim()
};

function createMainMenu(isVerified: boolean = false) {
  return {
    inline_keyboard: [
      [
        { text: isVerified ? `${CUSTOM_EMOJIS.stats} My Status` : `${CUSTOM_EMOJIS.logo} Verify Account`,
          callback_data: isVerified ? "status" : "verify" }
      ],
      [
        { text: `${CUSTOM_EMOJIS.mvp} Bonus Codes`, callback_data: "bonuscodes" },
        { text: `${CUSTOM_EMOJIS.play} Quick Links`, callback_data: "menu" }
      ],
      [
        { text: "🔔 Notifications", callback_data: "notifications" },
        { text: "❓ Help", callback_data: "help" }
      ]
    ]
  };
}

let botInstance: TelegramBot | null = null;
let healthCheckInterval: NodeJS.Timeout | null = null;

interface WagerRaceData {
  id: string;
  status: 'live' | 'completed';
  startDate: string;
  endDate: string;
  prizePool: number;
  participants: {
    uid: string;
    name: string;
    wagered: number;
    position: number;
  }[];
}

export async function initializeBot(): Promise<TelegramBot | null> {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    log("❌ TELEGRAM_BOT_TOKEN is not set!");
    return null;
  }

  try {
    log("Starting Telegram bot initialization...");
    const options: TelegramBot.ConstructorOptions = {
      filepath: false,
      polling: !process.env.WEBHOOK_URL
    };

    if (process.env.NODE_ENV === 'production' && process.env.WEBHOOK_URL) {
      options.webHook = {
        port: parseInt(process.env.WEBHOOK_PORT || '8443')
      };
    }

    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, options);
    botInstance = bot;

    if (process.env.NODE_ENV === 'production' && process.env.WEBHOOK_URL) {
      await bot.setWebHook(`${process.env.WEBHOOK_URL}/bot${process.env.TELEGRAM_BOT_TOKEN}`);
      log("Webhook set successfully");
    }

    log("Bot instance created, setting up event handlers...");

    await Promise.all([
      bot.setMyCommands(BOT_COMMANDS),
      bot.setInlineMode(true)
    ]);

    registerEventHandlers(bot);

    const botInfo = await bot.getMe();
    log(`✅ Bot initialized successfully as @${botInfo.username}`);
    log("Bot settings:", {
      username: botInfo.username,
      supportsInline: botInfo.supports_inline_queries,
      canJoinGroups: botInfo.can_join_groups,
      pollingEnabled: !process.env.WEBHOOK_URL
    });

    startHealthCheck();
    return bot;
  } catch (error) {
    if (error instanceof Error) {
      logError(error, 'Bot initialization');
    }
    return null;
  }
}

function registerEventHandlers(bot: TelegramBot) {
  bot.on('error', (error: Error) => {
    logError(error, 'Bot error');
  });

  bot.on('polling_error', (error: Error) => {
    logError(error, 'Polling error');
  });

  bot.onText(/\/start/, handleStart);
  bot.onText(/\/help/, handleHelp);
  bot.onText(/\/verify/, handleVerify);
  bot.onText(/\/menu/, handleMenu);
  bot.onText(/\/notifications/, handleNotifications);
  bot.onText(/\/bonuscodes/, handleBonusCodes);
  bot.onText(/\/pending/, handlePending);
  bot.onText(/\/stats/, handleStats);
  bot.onText(/\/status/, handleStatus);

  bot.on('callback_query', async (query) => {
    if (!query.message || !query.from.id) return;

    try {
      await rateLimiter.consume(query.from.id.toString());
      await handleCallbackQuery(query);
    } catch (error) {
      if (error instanceof Error) {
        logError(error, 'Callback query handler');
      }
      await bot.answerCallbackQuery(query.id, {
        text: "⚠️ Please wait before making more requests",
        show_alert: true
      });
    }
  });

  bot.on('inline_query', async (query) => {
    await handleInlineQuery(query);
  });

  bot.on("message", async (msg) => {
    if (msg.sticker) {
      console.log(`Received sticker. File ID: ${msg.sticker.file_id}`);
      await safeSendMessage(msg.chat.id, `Sticker File ID: ${msg.sticker.file_id}`);
      return;
    }
    
    if (!msg.text || !msg.from?.id) return;

    try {
      await rateLimiter.consume(msg.from.id.toString());
      await handleMessage(msg);
    } catch (error) {
      if (error instanceof Error) {
        logError(error, 'Message handler');
      }
      await safeSendMessage(msg.chat.id, "⚠️ Please wait before sending more commands.");
    }
  });
}

async function handleInlineQuery(query: TelegramBot.InlineQuery) {
  if (!botInstance) return;

  try {
    const searchTerm = query.query.toLowerCase();
    log(`Processing inline query: "${searchTerm}" from user: ${query.from.username || query.from.id}`);

    const results: InlineQueryResult[] = [];

    const raceData = await fetchCurrentRaceData();
    log('Fetched race data:', {
      success: Boolean(raceData),
      hasParticipants: raceData ? Boolean(raceData.participants.length) : false,
      participantsCount: raceData?.participants.length ?? 0
    });

    if (raceData && (searchTerm === '' || 'leaderboard'.includes(searchTerm))) {
      log('Adding leaderboard result');
      results.push(formatLeaderboardResult(raceData));
    }

    if ('daily'.includes(searchTerm) || 'today'.includes(searchTerm)) {
      log('Adding daily stats result');
      results.push(formatDailyStatsResult(raceData));
    }

    const user = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramId, query.from.id.toString()))
      .limit(1);

    if (user[0]?.isVerified && ('mystats'.includes(searchTerm) || 'stats'.includes(searchTerm))) {
      log('Adding personal stats result');
      results.push(formatPersonalStatsResult(user[0]));
    }

    log(`Sending ${results.length} inline results`);
    await botInstance.answerInlineQuery(query.id, results, {
      cache_time: 30,
      is_personal: true
    });

    logAction({
      action: 'Inline Query',
      userId: query.from.username || query.from.id.toString(),
      success: true,
      details: `Query: "${query.query}" - Results: ${results.length}`
    });
  } catch (error) {
    logError(error instanceof Error ? error : new Error('Unknown error'), 'Inline query handler');
    await sendFallbackInlineResponse(query);
  }
}

async function fetchCurrentRaceData(): Promise<WagerRaceData | null> {
  try {
    log('Fetching current race data from internal endpoint...');
    const apiBaseUrl = process.env.NODE_ENV === 'production'
      ? process.env.INTERNAL_API_URL || 'http://0.0.0.0:5000'
      : 'http://0.0.0.0:5000';

    const endpoint = `${apiBaseUrl}/api/wager-races/current`;
    log(`Fetching from endpoint: ${endpoint}`);

    const response = await fetch(endpoint);

    log('Internal API Response:', {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch race data: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    log('Race data received:', {
      id: data.id,
      status: data.status,
      participantsCount: data.participants?.length ?? 0
    });

    return data;
  } catch (error) {
    logError(error instanceof Error ? error : new Error('Unknown error fetching race data'), 'fetchCurrentRaceData');
    // Report errors to Slack
    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `❌ Race data fetch error: ${error.message}`
        })
      }).catch(err => log(`Slack notification failed: ${err.message}`, 'error'));
    }
    return null;
  }
}

function formatLeaderboardResult(data: WagerRaceData): InlineQueryResult {
  const topParticipants = data.participants.slice(0, 5);
  const leaderboardText = topParticipants.map((participant, index) =>
    `${index + 1}. ${participant.name}: ${participant.wagered}`
  ).join('\n');

  return {
    type: 'article',
    id: 'monthly_leaderboard',
    title: '🏆 Monthly Race Leaders (Top 5)',
    description: 'View current race standings',
    input_message_content: {
      message_text: `${CUSTOM_EMOJIS.leaderboard} *Monthly Race Leaders*\n\n${leaderboardText}\n\nPrize Pool: $${data.prizePool}\nUpdated: ${new Date().toLocaleString()}`,
      parse_mode: 'Markdown'
    }
  };
}

function formatDailyStatsResult(data: WagerRaceData): InlineQueryResult {
  const topDaily = data.participants.slice(0, 3);
  const dailyText = topDaily.map((participant, index) =>
    `${index + 1}. ${participant.name}: ${participant.wagered}`
  ).join('\n');

  return {
    type: 'article',
    id: 'daily_stats',
    title: '📊 Today\'s Top 3',
    description: 'View today\'s race progress',
    input_message_content: {
      message_text: `${CUSTOM_EMOJIS.stats} *Today's Race Progress*\n\n${dailyText}\n\nUpdated: ${new Date().toLocaleString()}`,
      parse_mode: 'Markdown'
    }
  };
}

function formatPersonalStatsResult(user: any): InlineQueryResult {
  return {
    type: 'article',
    id: 'personal_stats',
    title: '👤 My Stats',
    description: 'View your personal race statistics',
    input_message_content: {
      message_text: MESSAGES.status(user),
      parse_mode: 'Markdown'
    }
  };
}

async function sendFallbackInlineResponse(query: TelegramBot.InlineQuery) {
  if (!botInstance) return;

  await botInstance.answerInlineQuery(query.id, [{
    type: 'article',
    id: 'error',
    title: '❌ Error',
    description: 'Could not fetch data. Please try again.',
    input_message_content: {
      message_text: 'Could not fetch race data. Please try again later or use /menu in direct chat.'
    }
  }]);
}

async function handleMessage(msg: TelegramBot.Message) {
  if (!msg.text || !msg.from) return;

  logAction({
    action: 'Received Message',
    userId: msg.from.username || 'unknown',
    success: true,
    details: `Command: ${msg.text}`
  });

  const [command, ...args] = msg.text.split(" ");

  try {
    switch (command) {
      case '/verify':
        await handleVerify(msg, args[0]);
        break;
      case '/pending':
        await handlePending(msg);
        break;
      case '/help':
        await handleHelp(msg);
        break;
      case '/notifications':
        await handleNotifications(msg);
        break;
      case '/bonuscodes':
        await handleBonusCodes(msg);
        break;
      case '/stats':
        await handleStats(msg);
        break;
      case '/menu':
        await handleMenu(msg);
        break;
      default:
        if (command.startsWith('/')) {
          logAction({
            action: 'Unknown Command',
            userId: msg.from.username || 'unknown',
            success: false,
            details: command
          });
          await safeSendMessage(msg.chat.id, "Unknown command. Use /help to see available commands.");
        }
    }
  } catch (error) {
    if (error instanceof Error) {
      logError(error, `Error handling command ${command}`);
      await safeSendMessage(msg.chat.id, "❌ An error occurred. Please try again later.");
    }
  }
}

async function handleStart(msg: TelegramBot.Message) {
  if (!msg.from) return;

  try {
    logAction({
      action: 'Start Command',
      userId: msg.from.username,
      success: true
    });

    const user = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramId, msg.from.id.toString()))
      .limit(1);
    const isVerified = Boolean(user.length > 0 && user[0].isVerified);

    await safeSendMessage(msg.chat.id, MESSAGES.welcome, {
      parse_mode: "Markdown",
      reply_markup: createMainMenu(isVerified)
    });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, 'Start command');
    }
  }
}

async function handleVerify(msg: TelegramBot.Message, goatedUsername?: string) {
  if (!botInstance || !msg.from?.username) {
    return safeSendMessage(msg.chat.id, "❌ Please set a Telegram username first.");
  }

  if (!goatedUsername) {
    return safeSendMessage(msg.chat.id, MESSAGES.verifyInstructions, { parse_mode: "Markdown" });
  }

  try {
    const existing = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramId, msg.from.id.toString()))
      .limit(1);

    if (existing[0]) {
      logAction({
        action: 'Verification Attempt',
        userId: msg.from.username,
        success: false,
        details: 'Account already verified'
      });
      return safeSendMessage(msg.chat.id, "✅ Your account is already verified!");
    }

    await db.insert(verificationRequests).values({
      telegramId: msg.from.id.toString(),
      telegramUsername: msg.from.username,
      userId: parseInt(goatedUsername),
      status: "pending"
    });

    logAction({
      action: 'Verification Request',
      userId: msg.from.username,
      success: true,
      details: `Requested verification for Goated ID: ${goatedUsername}`
    });

    await safeSendMessage(msg.chat.id, MESSAGES.verificationSubmitted, { parse_mode: "Markdown" });

    const admins = await db
      .select()
      .from(users)
      .where(eq(users.isAdmin, true));

    for (const admin of admins) {
      if (!admin.telegramId) continue;

      const buttons = {
        inline_keyboard: [[
          { text: "✅ Approve", callback_data: `approve:${msg.from.username}` },
          { text: "❌ Reject", callback_data: `reject:${msg.from.username}` }
        ]]
      };

      await botInstance.sendMessage(
        parseInt(admin.telegramId),
        `🆕 New verification request:\n` +
        `Telegram: @${msg.from.username}\n` +
        `Goated: ${goatedUsername}`,
        { reply_markup: buttons }
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      logError(error, 'Verification process');
      await safeSendMessage(msg.chat.id, "❌ Error submitting request. Please try again later.");
    }
  }
}

async function handlePending(msg: TelegramBot.Message) {
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

    const pending = await db
      .select()
      .from(verificationRequests)
      .where(eq(verificationRequests.status, 'pending'));

    if (pending.length === 0) {
      return safeSendMessage(msg.chat.id, "✅ No pending requests!");
    }

    await safeSendMessage(msg.chat.id, MESSAGES.pendingRequests(pending), { parse_mode: "Markdown" });
  } catch (error) {
    if (error instanceof Error) {
      log(`Error listing pending requests: ${error.message}`);
      await safeSendMessage(msg.chat.id, "❌ Error fetching pending requests.");
    }
  }
}

async function handleApproval(request: any, adminId: string, query: TelegramBot.CallbackQuery) {
  if (!botInstance) return;

  try {
    await db
      .update(verificationRequests)
      .set({
        status: 'approved',
        verifiedAt: new Date(),
        verifiedBy: adminId
      })
      .where(eq(verificationRequests.telegramUsername, request.telegramUsername));

    await db
      .insert(telegramUsers)
      .values({
        telegramId: request.telegramId,
        telegramUsername: request.telegramUsername,
        userId: request.userId,
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: adminId
      });

    await botInstance.editMessageText(
      `✅ Approved @${request.telegramUsername}`,
      {
        chat_id: query.message?.chat.id,
        message_id: query.message?.message_id
      }
    );

    await botInstance.sendMessage(
      parseInt(request.telegramId),
      "✅ Your account has been verified! Welcome to Goated!"
    );

    await botInstance.answerCallbackQuery(query.id, {
      text: "User approved successfully",
      show_alert: true
    });
  } catch (error) {
    if (error instanceof Error) {
      log(`Error approving user: ${error.message}`);
      await botInstance.answerCallbackQuery(query.id, {
        text: "Error approving user",
        show_alert: true
      });
    }
  }
}

async function handleRejection(request: any, adminId: string, query: TelegramBot.CallbackQuery) {
  if (!botInstance) return;

  try {
    await db
      .update(verificationRequests)
      .set({
        status: 'rejected',
        verifiedAt: new Date(),
        verifiedBy: adminId
      })
      .where(eq(verificationRequests.telegramUsername, request.telegramUsername));

    await botInstance.editMessageText(
      `❌ Rejected @${request.telegramUsername}`,
      {
        chat_id: query.message?.chat.id,
        message_id: query.message?.message_id
      }
    );

    await botInstance.sendMessage(
      parseInt(request.telegramId),
      "❌ Your verification request was rejected. Please ensure you provided the correct Goated username and try again with /verify."
    );

    await botInstance.answerCallbackQuery(query.id, {
      text: "User rejected successfully",
      show_alert: true
    });
  } catch (error) {
    if (error instanceof Error) {
      log(`Error rejecting user: ${error.message}`);
      await botInstance.answerCallbackQuery(query.id, {
        text: "Error rejecting user",
        show_alert: true
      });
    }
  }
}

async function handleNotifications(msg: TelegramBot.Message) {
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

    const newStatus = !user[0].notificationsEnabled;

    await db
      .update(telegramUsers)
      .set({ notificationsEnabled: newStatus })
      .where(eq(telegramUsers.telegramId, msg.from.id.toString()));

    await safeSendMessage(
      msg.chat.id,
      `✅ Notifications ${newStatus ? 'enabled' : 'disabled'} successfully!`
    );
  } catch (error) {
    if (error instanceof Error) {
      log(`Error toggling notifications: ${error.message}`);
      await safeSendMessage(msg.chat.id, "❌ Error updating notification preferences.");
    }
  }
}

async function handleBonusCodes(msg: TelegramBot.Message) {
  if (!msg.from?.id) return;

  try {
    const user = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramId, msg.from.id.toString()))
      .limit(1);

    if (!user[0]?.isVerified) {
      return safeSendMessage(msg.chat.id, "❌ This command is only available for verified users.");
    }

    await safeSendMessage(
      msg.chat.id,
      MESSAGES.bonusCodes,
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    if (error instanceof Error) {
      log(`Error fetching bonus codes: ${error.message}`);
      await safeSendMessage(msg.chat.id, "❌ Error fetching bonus codes.");
    }
  }
}

async function handleStats(msg: TelegramBot.Message) {
  if (!msg.from?.id) return;

  try {
    const admin = await db
      .select()
      .from(users)
      .where(eq(users.telegramId, msg.from.id.toString()))
      .limit(1);

    if (!admin[0]?.isAdmin) {
      return safeSendMessage(msg.chat.id, "❌ This command is for admins only.");
    }

    const verifiedUsers = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.isVerified, true));

    const pendingRequests = await db
      .select()
      .from(verificationRequests)
      .where(eq(verificationRequests.status, 'pending'));

    await safeSendMessage(msg.chat.id, MESSAGES.stats(verifiedUsers.length, pendingRequests.length), { parse_mode: "Markdown" });
  } catch (error) {
    if (error instanceof Error) {
      log(`Error fetching stats: ${error.message}`);
      await safeSendMessage(msg.chat.id, "❌ Error fetching platform statistics.");
    }
  }
}

async function handleHelp(msg: TelegramBot.Message) {
  const isAdmin = await checkIsAdmin(msg.from?.id?.toString());
  await safeSendMessage(msg.chat.id, MESSAGES.help(isAdmin), { parse_mode: "Markdown" });
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
  } catch (error) {
    if (error instanceof Error) {
      log(`Error checking admin status: ${error.message}`);
    }
    return false;
  }
}

async function handleCallbackQuery(query: TelegramBot.CallbackQuery) {
  if (!query.message || !query.from.id) {
    log("Received callback query without message");
    return;
  }

  logAction({
    action: 'Callback Query',
    userId: query.from.username,
    success: true,
    details: `Action: ${query.data}`
  });

  try {
    switch (query.data) {
      case 'menu':
        await handleMenu(query.message);
        break;

      case 'verify':
        await botInstance?.sendMessage(
          query.message.chat.id,
          MESSAGES.verifyInstructions,
          { parse_mode: "Markdown" }
        );
        break;

      case 'help':
        const isAdmin = await checkIsAdmin(query.from.id.toString());
        await botInstance?.sendMessage(
          query.message.chat.id,
          MESSAGES.help(isAdmin),
          { parse_mode: "Markdown" }
        );
        break;

      case 'status':
        await handleStatus({ ...query.message, from: query.from });
        break;

      case 'bonuscodes':
        await handleBonusCodes({ ...query.message, from: query.from });
        break;

      case 'notifications':
        await handleNotifications({ ...query.message, from: query.from });
        break;

      default:
        if (query.data?.startsWith('approve:') || query.data?.startsWith('reject:')) {
          const [action, username] = query.data.split(':');
          const adminId = query.from.id.toString();

          const request = await db
            .select()
            .from(verificationRequests)
            .where(eq(verificationRequests.telegramUsername, username))
            .limit(1);

          if (!request[0]) {
            return botInstance?.answerCallbackQuery(query.id, {
              text: "❌ Request not found",
              show_alert: true
            });
          }

          if (action === 'approve') {
            await handleApproval(request[0], adminId, query);
          } else {
            await handleRejection(request[0], adminId, query);
          }
        }
    }

    await botInstance?.answerCallbackQuery(query.id);
  } catch (error) {
    if (error instanceof Error) {
      logError(error, 'Callback query handler');
      await botInstance?.answerCallbackQuery(query.id, {
        text: "❌ Error processing request",
        show_alert: true
      });
    }
  }
}

async function handleStatus(msg: TelegramBot.Message) {
  if (!msg.from?.id) return;

  try {
    const user = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramId, msg.from.id.toString()))
      .limit(1);

    if (!user[0]) {
      return safeSendMessage(msg.chat.id, "❌ Your account is not verified. Use /verify to link your Goated.com account.");
    }

    await safeSendMessage(msg.chat.id, MESSAGES.status(user[0]), { parse_mode: "Markdown" });
  } catch (error) {
    if (error instanceof Error) {
      log(`Error in status command: ${error.message}`);
      await safeSendMessage(msg.chat.id, "❌ Error checking status. Please try again later.");
    }
  }
}

async function safeSendMessage(chatId: number, text: string, options: any = {}) {
  if (!botInstance) return;

  try {
    await botInstance.sendMessage(chatId, text, options);
  } catch (error) {
    if (error instanceof Error) {
      log(`Failed to send message to ${chatId}: ${error.message}`);
    }
  }
}

function startHealthCheck() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval as NodeJS.Timeout);
  }

  healthCheckInterval = setInterval(async () => {
    if (!botInstance) return;

    try {
      await botInstance.getMe();
      log("✅ Bot health check passed");
    } catch (error) {
      if (error instanceof Error) {
        log(`❌ Bot health check failed`: ${error.message}`);
      }
      await initializeBot();
    }
  }, 60000);
}

export {
  initializeBot,
  handleMessage,
  handleStart,
  handleHelp,
  handleVerify,
  handleMenu,
  handleNotifications,
  handleBonusCodes,
  handlePending,
  handleStats,
  handleStatus,
  handleCallbackQuery
};
export const bot = botInstance;