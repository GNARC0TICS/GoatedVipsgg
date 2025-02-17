import { z } from "zod";
import type { Express } from "express";
import TelegramBot from "node-telegram-bot-api";
import { db } from "@db";
import { telegramUsers, verificationRequests } from "@db/schema";
import { users } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { logError, logAction } from "./utils/logger";
import { RateLimiterMemory } from "rate-limiter-flexible";

/**
 * ============================================================================
 * GOATEDVIPS TELEGRAM BOT - MESSAGE GUIDE
 * ============================================================================
 * 
 * This file contains all message templates and configurations for the Telegram bot.
 * Edit messages here to update bot responses platform-wide.
 * 
 * SECTIONS:
 * 1. Emoji Constants
 * 2. Button Templates
 * 3. Message Templates
 *    - Welcome & Help
 *    - Verification Flow
 *    - Statistics & Leaderboard
 *    - Admin Commands
 *    - General Messages
 * 4. Command Handlers
 * 5. Utility Functions
 */

/**
 * ======================
 * 1. CUSTOM EMOJI SET
 * ======================
 * Used for consistent branding across all bot messages
 */
const CUSTOM_EMOJIS = {
  error: "❌",      // Error/failure indicators
  success: "✅",    // Success/completion indicators
  vip: "👑",       // VIP/premium features
  stats: "📊",     // Statistics and data
  race: "🏃",      // Wager races
  play: "🎮",      // Gaming actions
  bonus: "🎁",     // Bonus codes/rewards
  challenge: "🎯", // Challenges/competitions
  verify: "✨",    // Verification process
  refresh: "🔄",    // Refresh/update actions
  bell: "🔔",
  sparkle: "✨"
};

/**
 * ======================
 * 2. BUTTON TEMPLATES
 * ======================
 * Reusable keyboard markup creators for interactive elements
 */
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
// Channels to monitor
const MONITORED_CHANNELS = ['@Goatedcom']; // Add official channel username
const AFFILIATE_LINK = 'https://www.Goated.com/r/REDEEM';

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
  { command: 'reject', description: '❌ Reject a verification request' },
  { command: 'createbonus', description: '🎁 Create a bonus code' },
  { command: 'createchallenge', description: '🎯 Create a challenge' }
];

/**
 * ======================
 * 3. MESSAGE TEMPLATES
 * ======================
 * Centralized message templates for consistent communication
 * 
 * Usage:
 * - Edit messages here to update bot responses platform-wide
 * - Use ${CUSTOM_EMOJIS.type} for consistent emoji usage
 * - Maintain markdown formatting for better readability
 */
const MESSAGES = {
  /**
   * Welcome & Help Messages
   * ----------------------
   */
  welcome: async (isAdmin: boolean) => {
    const adminSection = isAdmin ? `
*Admin Commands:*
• /broadcast - Send message to all users
• /pending - View verification requests
• /verify - Verify a user
• /reject - Reject a verification

` : '';

    return `${CUSTOM_EMOJIS.vip} *Welcome to GoatedVIPs Bot*

${adminSection}*Available Commands:*
• /start - Get started with the bot
• /verify - Link your Goated account
• /stats - View your wager statistics
• /race - Check your race position
• /leaderboard - See top players
• /play - Play on Goated with our link
• /website - Visit GoatedVIPs.gg
• /bonuscodes - Get latest bonus codes
• /challenges - Join exclusive challenges

Need help? Contact @xGoombas for support.`.trim()
  },

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
    return `🏆 *Monthly Race Leaderboard*
💵 *Prize Pool: $500*
🏁 *Current Top 10:*

${top10.map((p, i) => {
      const telegramUsername = userIdToTelegramMap.get(p.uid);
      const displayName = telegramUsername ? `@${telegramUsername}` : p.name;
      const formattedAmount = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3
      }).format(p.wagered);
      return `${(i + 1).toString().padStart(2)}. ${displayName}\n    💰 $ ${formattedAmount}`;
    }).join('\n\n')}

📊 Updated: ${new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true
    })}`.trim();
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
let isPolling = false;

// Export bot instance for webhook handler
export const getBot = () => botInstance;

function log(level: "error" | "info" | "debug", message: string) {
  console.log(`[${level.toUpperCase()}] ${message}`);
}

// Add cleanup handler
function cleanup() {
  if (botInstance && isPolling) {
    try {
      botInstance.stopPolling();
      isPolling = false;
      log("info", "Bot polling stopped");
    } catch (error) {
      log("error", `Error stopping bot: ${error}`);
    }
  }
}

// Handle process termination
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

// Export the update handler for webhook
export const handleUpdate = async (update: TelegramBot.Update) => {
  if (!botInstance) {
    throw new Error('Bot not initialized');
  }

  try {
    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    } else if (update.channel_post) {
      await handleChannelPost(update.channel_post);
    }
  } catch (error) {
    log("error", `Error handling update: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
};


async function initializeBot(): Promise<TelegramBot | null> {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    log("error", "TELEGRAM_BOT_TOKEN is not set!");
    return null;
  }

  try {
    // Ensure admin user exists without last_login_at
    await db.insert(users)
      .values({
        username: 'admin',
        password: process.env.ADMIN_PASSWORD || 'admin',
        email: 'admin@goatedvips.gg',
        isAdmin: true,
        telegramId: process.env.ADMIN_TELEGRAM_ID
      })
      .onConflictDoUpdate({
        target: users.username,
        set: {
          isAdmin: true,
          telegramId: process.env.ADMIN_TELEGRAM_ID
        }
      });

    // Configure webhook URL using main server port since it handles the webhook endpoint
    const webhookUrl = `https://goatedvips.gg/api/telegram/webhook`;
    log("info", `Setting webhook URL to: ${webhookUrl}`);

    const options: TelegramBot.ConstructorOptions = {
      webHook: {
        port: parseInt(process.env.PORT || '5000'),
        host: "0.0.0.0",
        autoOpen: false
      }
    };

    // Add debug logging for environment variables
    log("info", `REPL_SLUG: ${process.env.REPL_SLUG}`);
    log("info", `REPL_OWNER: ${process.env.REPL_OWNER}`);
    log("info", `BOT_PORT: ${process.env.BOT_PORT}`);

    if (botInstance) {
      log("info", "Bot instance already exists, reusing existing instance");
      return botInstance;
    }

    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, options);
    botInstance = bot;

    // Delete any existing webhook before setting new one
    try {
      await bot.deleteWebHook();
      log("info", "Deleted existing webhook");
    } catch (error) {
      log("error", `Error deleting webhook: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      // Set webhook with error handling
      await bot.setWebHook(webhookUrl);
      log("info", `Webhook set successfully to: ${webhookUrl}`);
    } catch (webhookError) {
      if (webhookError instanceof Error) {
        log("error", `Failed to set webhook: ${webhookError.message}`);
      } else {
        log("error", "Unknown error setting webhook");
      }
      // Continue initialization even if webhook fails
    }

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
          await bot.getChat(parseInt(admin.telegramId));
          await bot.setMyCommands([...BOT_COMMANDS, ...ADMIN_COMMANDS], {
            scope: {
              type: 'chat',
              chat_id: parseInt(admin.telegramId)
            }
          });
          log("info", `Set admin commands for ${admin.telegramId}`);
        } catch (cmdError) {
          if (cmdError instanceof Error && cmdError.message.includes('chat not found')) {
            log("info", `Admin ${admin.telegramId} hasn't started a chat with the bot yet`);
          } else {
            log("error", `Failed to set admin commands for ${admin.telegramId}: ${cmdError}`);
          }
        }
      }
    } catch (adminError) {
      log("error", `Error setting admin commands: ${adminError}`);
    }

    // Verify webhook is properly set
    const webhookInfo = await bot.getWebHookInfo();
    log("info", `Current webhook status: ${JSON.stringify(webhookInfo)}`);
    
    if (!webhookInfo.url || webhookInfo.url !== webhookUrl) {
      log("info", "Webhook URL mismatch - updating webhook configuration");
      await bot.deleteWebHook();
      await bot.setWebHook(webhookUrl);
      const updatedInfo = await bot.getWebHookInfo();
      log("info", `Updated webhook status: ${JSON.stringify(updatedInfo)}`);
    }

    registerEventHandlers(bot);
    const botInfo = await bot.getMe();
    log("info", `Bot initialized successfully as @${botInfo.username}`);
    return bot;

  } catch (error) {
    log("error", `Bot initialization error: ${error instanceof Error ? error.message : String(error)}`);
    cleanup();
    return null;
  }
}

function registerEventHandlers(bot: TelegramBot) {
  // Monitor channel posts
  bot.on('channel_post', async (msg) => {
    if (!msg.chat.username || !MONITORED_CHANNELS.includes('@' + msg.chat.username)) return;
    
    try {
      // Get all groups where bot is admin
      const updates = await bot.getUpdates();
      const uniqueGroupIds = new Set<number>();
      
      for (const update of updates) {
        if (update.message?.chat.type === 'group' || update.message?.chat.type === 'supergroup') {
          uniqueGroupIds.add(update.message.chat.id);
        }
      }

      // Replace Goated links with affiliate link
      let messageText = msg.text || '';
      messageText = messageText.replace(
        /https?:\/\/(?:www\.)?goated\.com\/[^\s]*/gi,
        AFFILIATE_LINK
      );

      // Forward to all groups where bot is admin
      for (const groupId of uniqueGroupIds) {
        try {
          const admins = await bot.getChatAdministrators(groupId);
          const botIsMember = admins.some(admin => admin.user.id === botInstance?.options.polling?.params?.id);
          
          if (botIsMember) {
            await safeSendMessage(groupId, `📢 *Announcement from Goated*\n\n${messageText}`, {
              parse_mode: "Markdown",
              disable_web_page_preview: false
            });
          }
        } catch (error) {
          log("error", `Failed to forward to group ${groupId}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } catch (error) {
      log("error", `Channel post forwarding error: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

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
  bot.onText(/\/createbonus (.+)/, (msg, match) => handleCreateBonus(msg, match ? match[1] : undefined));
  bot.onText(/\/createchallenge (.+)/, (msg, match) => handleCreateChallenge(msg, match ? match[1] : undefined));
  
  // Interactive creation states
  const creationStates = new Map();

  // Add help text for bonus creation
  bot.onText(/\/createbonus$/, async (msg) => {
    if (msg.chat.type !== 'private') {
      return safeSendMessage(msg.chat.id, "⚠️ Please use this command in private chat with the bot.");
    }

    const isAdmin = await checkIsAdmin(msg.from?.id?.toString());
    if (!isAdmin) {
      return safeSendMessage(msg.chat.id, "❌ This command is for admins only.");
    }

    creationStates.set(msg.from.id, { type: 'bonus', step: 'start' });

    const markup = {
      inline_keyboard: [[
        { text: "🎁 Start Creating Bonus Code", callback_data: "bonus_start" }
      ]]
    };

    await safeSendMessage(msg.chat.id,
      "🎁 *Welcome to Bonus Code Creation*\n\n" +
      "This wizard will guide you through creating a new bonus code.\n" +
      "Click the button below to begin.",
      { 
        parse_mode: "Markdown",
        reply_markup: markup
      }
    );
  });

  // Add help text for challenge creation
  bot.onText(/\/createchallenge$/, async (msg) => {
    if (msg.chat.type !== 'private') {
      return safeSendMessage(msg.chat.id, "⚠️ Please use this command in private chat with the bot.");
    }

    const isAdmin = await checkIsAdmin(msg.from?.id?.toString());
    if (!isAdmin) {
      return safeSendMessage(msg.chat.id, "❌ This command is for admins only.");
    }

    creationStates.set(msg.from.id, { type: 'challenge', step: 'start' });

    const markup = {
      inline_keyboard: [[
        { text: "🎯 Start Creating Challenge", callback_data: "challenge_start" }
      ]]
    };

    await safeSendMessage(msg.chat.id,
      "🎯 *Welcome to Challenge Creation*\n\n" +
      "This wizard will guide you through creating a new challenge.\n" +
      "Click the button below to begin.",
      { 
        parse_mode: "Markdown",
        reply_markup: markup
      }
    );
  });

  bot.on("message", async (msg) => {
    if (!msg.text || !msg.from?.id) return;
    try {
      await rateLimiter.consume(msg.from.id.toString());
      
      const state = creationStates.get(msg.from.id);
      if (state) {
        const isAdmin = await checkIsAdmin(msg.from.id.toString());
        if (!isAdmin) return;

        if (state.type === 'bonus') {
          switch (state.step) {
            case 'code':
              creationStates.set(msg.from.id, { ...state, step: 'amount', code: msg.text });
              await safeSendMessage(msg.chat.id,
                "💰 *Enter Bonus Amount*\n\n" +
                "Please enter the bonus amount (e.g., $100).\n" +
                "Reply with the amount.",
                { parse_mode: "Markdown" }
              );
              break;
            case 'amount':
              creationStates.set(msg.from.id, { ...state, step: 'claims', amount: msg.text });
              await safeSendMessage(msg.chat.id,
                "👥 *Enter Total Claims*\n\n" +
                "How many times can this bonus be claimed?\n" +
                "Reply with a number.",
                { parse_mode: "Markdown" }
              );
              break;
            case 'claims':
              creationStates.set(msg.from.id, { ...state, step: 'days', claims: parseInt(msg.text) });
              await safeSendMessage(msg.chat.id,
                "📅 *Enter Expiration Days*\n\n" +
                "How many days until this bonus expires?\n" +
                "Reply with a number.",
                { parse_mode: "Markdown" }
              );
              break;
            case 'days':
              creationStates.set(msg.from.id, { ...state, step: 'description', days: parseInt(msg.text) });
              await safeSendMessage(msg.chat.id,
                "📝 *Enter Description*\n\n" +
                "Please enter a description for this bonus code.\n" +
                "Reply with the description.",
                { parse_mode: "Markdown" }
              );
              break;
            case 'description':
              const bonusData = {
                ...state,
                description: msg.text
              };
              await handleCreateBonus(msg, `${bonusData.code}|${bonusData.amount}|${bonusData.claims}|${bonusData.days}|${bonusData.description}`);
              creationStates.delete(msg.from.id);
              break;
          }
        } else if (state.type === 'challenge') {
          switch (state.step) {
            case 'minBet':
              creationStates.set(msg.from.id, { ...state, step: 'multiplier', minBet: msg.text });
              await safeSendMessage(msg.chat.id,
                "✨ *Enter Required Multiplier*\n\n" +
                "Please enter the required multiplier (e.g., 3x).\n" +
                "Reply with the multiplier.",
                { parse_mode: "Markdown" }
              );
              break;
            case 'multiplier':
              creationStates.set(msg.from.id, { ...state, step: 'prize', multiplier: msg.text });
              await safeSendMessage(msg.chat.id,
                "🏆 *Enter Prize Amount*\n\n" +
                "Please enter the prize amount (e.g., $1000).\n" +
                "Reply with the amount.",
                { parse_mode: "Markdown" }
              );
              break;
            case 'prize':
              creationStates.set(msg.from.id, { ...state, step: 'winners', prize: msg.text });
              await safeSendMessage(msg.chat.id,
                "👥 *Enter Max Winners*\n\n" +
                "How many winners can claim this prize?\n" +
                "Reply with a number.",
                { parse_mode: "Markdown" }
              );
              break;
            case 'winners':
              creationStates.set(msg.from.id, { ...state, step: 'days', winners: parseInt(msg.text) });
              await safeSendMessage(msg.chat.id,
                "📅 *Enter Duration Days*\n\n" +
                "How many days should this challenge run?\n" +
                "Reply with a number.",
                { parse_mode: "Markdown" }
              );
              break;
            case 'days':
              creationStates.set(msg.from.id, { ...state, step: 'description', days: parseInt(msg.text) });
              await safeSendMessage(msg.chat.id,
                "📝 *Enter Description*\n\n" +
                "Please enter a description for this challenge.\n" +
                "Reply with the description.",
                { parse_mode: "Markdown" }
              );
              break;
            case 'description':
              const challengeData = {
                ...state,
                description: msg.text
              };
              await handleCreateChallenge(msg, `${challengeData.game}|${challengeData.minBet}|${challengeData.multiplier}|${challengeData.prize}|${challengeData.winners}|${challengeData.days}|${challengeData.description}`);
              creationStates.delete(msg.from.id);
              break;
          }
        }
      }
    } catch {
      await safeSendMessage(msg.chat.id, "⚠️ Please wait before sending more commands.");
    }
  });

  // Add callback query handler for buttons
  bot.on('callback_query', handleCallbackQuery);
}

/**
 * ======================
 * 4. COMMAND HANDLERS
 * ======================
 * Implementation of all bot commands and their business logic
 * 
 * Structure:
 * - Each handler corresponds to a specific bot command
 * - Handlers validate input and permissions
 * - Use MESSAGES constant for responses
 * - Implement proper error handling
 */

/**
 * Start Command Handler
 * Sends welcome message and initial instructions
 */
async function handleStart(msg: TelegramBot.Message) {
  if (!botInstance) return;
  const isAdmin = await checkIsAdmin(msg.from?.id?.toString());
  const welcomeMessage = await MESSAGES.welcome(isAdmin);
  await sendMessageWithEmoji(botInstance, msg.chat.id, CUSTOM_EMOJIS.welcome, welcomeMessage, { parse_mode: "Markdown" });
}

async function handleHelp(msg: TelegramBot.Message) {
  const isAdmin = await checkIsAdmin(msg.from?.id?.toString());
  const helpMessage = MESSAGES.help(isAdmin);
  
  const markup = {
    inline_keyboard: [
      [
        { text: "🎮 Play Now", callback_data: "action_play" },
        { text: "📊 My Stats", callback_data: "action_stats" }
      ],
      [
        { text: "🏆 Leaderboard", callback_data: "action_leaderboard" },
        { text: "🎁 Bonus Codes", callback_data: "action_bonus" }
      ],
      [
        { text: "🌐 Website", url: "https://goatedvips.gg" }
      ]
    ]
  };

  await safeSendMessage(msg.chat.id, helpMessage, { 
    parse_mode: "Markdown",
    reply_markup: markup
  });
}

async function handleWebsite(msg: TelegramBot.Message) {
  await safeSendMessage(msg.chat.id, MESSAGES.website, { parse_mode: "Markdown" });
}

async function handlePlay(msg: TelegramBot.Message) {
  await safeSendMessage(msg.chat.id, MESSAGES.play, { parse_mode: "Markdown" });
}


async function handleVerify(msg: TelegramBot.Message, username?: string) {
  if (!msg.from?.id || !botInstance) return;

  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();

  // If in group chat, direct to private chat
  if (msg.chat.type !== 'private') {
    return botInstance.sendMessage(
      chatId,
      'Please start a private chat with me to complete verification:\n' +
      'https://t.me/GoatedVIPsBot?start=verify'
    );
  }

  if (!username) {
    return botInstance.sendMessage(chatId, MESSAGES.verifyInstructions, {
      parse_mode: "Markdown"
    });
  }

  try {
    // Check if user already has a pending verification
    const existingRequest = await db
      .select()
      .from(verificationRequests)
      .where(eq(verificationRequests.telegramId, telegramId))
      .orderBy(verificationRequests.requestedAt)
      .limit(1);

    if (existingRequest?.[0]?.status === 'pending') {
      return botInstance.sendMessage(chatId,
        '⏳ You already have a pending verification request.\n\n' +
        'Please wait for an admin to review your request.\n' +
        'If you need help, contact @xGoombas');
    }

    // Check if user is already verified
    const existingUser = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramId, telegramId))
      .execute();

    if (existingUser?.[0]?.isVerified) {
      return botInstance.sendMessage(chatId,
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
      return botInstance.sendMessage(chatId,
        '❌ This username was not found in our system. Please make sure you\'ve entered your correct Goated username.');
    }

    // Create verification request with all required fields
    const verificationData = {
      userId: goatedUser[0].id,
      telegramId: telegramId,
      telegramUsername: msg.from.username || 'unknown',
      goatedUsername: username,
      status: 'pending',
      requestedAt: new Date(),
    } as const;

    await db.insert(verificationRequests)
      .values(verificationData);

    await botInstance.sendMessage(chatId, MESSAGES.verificationSubmitted, {
      parse_mode: "Markdown"
    });

    // Notify admins
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

      await botInstance.sendMessage(admin.telegramId, message, {
        parse_mode: "Markdown",
        reply_markup: createVerificationButtons(msg.from.username ||'unknown')
      });
    }
  } catch (error) {
    console.error('Verification error:', error instanceof Error ? error.message : String(error));
    await botInstance.sendMessage(chatId, '❌ Error submitting request. Please try again later.');
  }
}

async function handleRace(msg: TelegramBot.Message) {
  if (!msg.from?.id || !botInstance) return;

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
  if (!msg.from?.id || !botInstance) return;

  const isAdmin = await checkIsAdmin(msg.from.id.toString());
  if (isAdmin && !msg.text.includes(' ')) {
    // Fun admin responses array
    const adminResponses = [
      "🎉 You're the GOAT! You don't need stats, just bask in your greatness! 🌟",
      "👑 Stats? Please... You write the stats, you ARE the stats! 💫",
      "🚀 Admin stats loading... ERROR: Too legendary to compute! 🌠"
    ];
    // Pick a random response
    const randomResponse = adminResponses[Math.floor(Math.random() * adminResponses.length)];
    return await safeSendMessage(msg.chat.id, randomResponse);
  }

  try {
    const user = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramId, msg.from.id.toString()))
      .limit(1);

    if (!user[0]) {
      return safeSendMessage(msg.chat.id, "❌ Please verify your account first using /verify");
    }

    const userData = user[0];
    const raceStats = await db
      .select()
      .from(wagerRaces)
      .where(eq(wagerRaces.userId, userData.userId))
      .orderBy(desc(wagerRaces.createdAt))
      .limit(1);

    const stats = raceStats[0];
    const progress = stats ? createProgressBar(stats.currentWager || 0, stats.targetWager || 100000, 8) : '░'.repeat(8);
    const formattedWager = formatNumber(stats?.currentWager || 0);
    const formattedTarget = formatNumber(stats?.targetWager || 100000);

    const enhancedStats = `
${CUSTOM_EMOJIS.stats} *Your Stats*

• Username: ${userData.username}
• Verified: ${userData.isVerified ? CUSTOM_EMOJIS.success : CUSTOM_EMOJIS.error}
• VIP Status: ${CUSTOM_EMOJIS.vip}

*Race Progress*
${progress}
${formattedWager} / ${formattedTarget}

${CUSTOM_EMOJIS.bell} Notifications: ${userData.notificationsEnabled ? 'On 🔔' : 'Off 🔕'}
${userData.verifiedAt ? `${CUSTOM_EMOJIS.sparkle} Member since: ${new Date(userData.verifiedAt).toLocaleDateString()}` : ''}`;

    await safeSendMessage(msg.chat.id, enhancedStats, { parse_mode: "Markdown" });
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

    // Get the most recent verification request for this telegram username
    const request = await db
      .select()
      .from(verificationRequests)
      .where(eq(verificationRequests.telegramUsername, username))
      .orderBy(verificationRequests.requestedAt, "desc")
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

    // Begin atomic updates
    await db.transaction(async (tx) => {
      // Update verification request status
      await tx
        .update(verificationRequests)
        .set({
          status: 'approved',
          verifiedAt: new Date(),
          verifiedBy: admin[0].id.toString(),
          adminNotes: `Approved by @${msg.from?.username || 'unknown'}`
        })
        .where(eq(verificationRequests.id, request[0].id));

      // Create or update telegram user record
      await tx
        .insert(telegramUsers)
        .values({
          telegramId: request[0].telegramId,
          telegramUsername: request[0].telegramUsername,
          userId: request[0].userId,
          isVerified: true,
          verifiedAt: new Date(),
          verifiedBy: admin[0].id.toString(),
          notificationsEnabled: true
        })
        .onConflictDoUpdate({
          target: telegramUsers.telegramId,
          set: {
            isVerified: true,
            verifiedAt: new Date(),
            verifiedBy: admin[0].id.toString(),
            userId: request[0].userId,
            telegramUsername: request[0].telegramUsername
          }
        });

      // Update user record
      await tx
        .update(users)
        .set({
          telegramId: request[0].telegramId,
          telegramVerified: true
        })
        .where(eq(users.id, request[0].userId));
    });

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
  if (!botInstance || !msg.from?.id) return;

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

export async function broadcastPositionChange(message: string) {
  if (!botInstance) return;

  try {
    // Send to verified users
    const verifiedUsers = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.isVerified, true));

    for (const user of verifiedUsers) {
      try {
        await safeSendMessage(parseInt(user.telegramId), message, { 
          parse_mode: "Markdown",
          disable_notification: false 
        });
      } catch (error) {
        log("error", `Failed to send position change to user ${user.telegramId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Get all chats where bot is admin
    try {
      const updates = await botInstance.getUpdates();
      const uniqueGroupIds = new Set<number>();
      
      for (const update of updates) {
        if (update.message?.chat.type === 'group' || update.message?.chat.type === 'supergroup') {
          uniqueGroupIds.add(update.message.chat.id);
        }
      }

      // Send to all groups where bot is admin
      for (const groupId of uniqueGroupIds) {
        try {
          const admins = await botInstance.getChatAdministrators(groupId);
          const botIsMember = admins.some(admin => admin.user.id === botInstance?.options.polling?.params?.id);
          
          if (botIsMember) {
            await safeSendMessage(groupId, message, {
              parse_mode: "Markdown",
              disable_notification: false
            });
          }
        } catch (error) {
          log("error", `Failed to send to group ${groupId}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } catch (error) {
      log("error", `Failed to get group list: ${error instanceof Error ? error.message : String(error)}`);
    }
  } catch (error) {
    log("error", `Position change broadcast error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function handleBroadcast(msg: TelegramBot.Message, message?: string) {
  if (!botInstance || !msg.from?.id) return;

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
    const sent = await botInstance.sendMessage(chatId, text, options);
    
    // Auto-delete lengthy command responses in group chats after delay
    if (sent.chat.type === 'group' || sent.chat.type === 'supergroup') {
      const isLongMessage = text.length > 200;
      const isCommandResponse = text.includes('/') || 
                               text.includes('Available commands') || 
                               text.includes('Your stats') ||
                               text.includes('Leaderboard');
                               
      if (isLongMessage && isCommandResponse) {
        setTimeout(async () => {
          try {
            await botInstance?.deleteMessage(chatId, sent.message_id);
          } catch (err) {
            log("error", `Failed to delete message: ${err}`);
          }
        }, 30000); // Delete after 30 seconds
      }
    }
    
    return sent;
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
  if (!botInstance) return;
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

async function handleCreateBonus(msg: TelegramBot.Message, params?: string) {
  if (!msg.from?.id) return;
  
  const isAdmin = await checkIsAdmin(msg.from.id.toString());
  if (!isAdmin) {
    return safeSendMessage(msg.chat.id, "❌ This command is for admins only.");
  }

  if (!params) {
    return safeSendMessage(msg.chat.id, "❌ Please provide bonus code parameters.");
  }

  try {
    const [code, bonusAmount, totalClaims, days, description] = params.split('|');
    
    if (!code || !bonusAmount || !totalClaims || !days) {
      return safeSendMessage(msg.chat.id, "❌ Missing required parameters.");
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(days));

    const [bonusCode] = await db
      .insert(bonusCodes)
      .values({
        code,
        bonusAmount,
        totalClaims: parseInt(totalClaims),
        currentClaims: 0,
        expiresAt,
        description: description || null,
        status: 'active',
        source: 'telegram',
        createdBy: msg.from.id
      })
      .returning();

    await safeSendMessage(msg.chat.id,
      `✅ Bonus code created successfully!\n\n` +
      `Code: ${bonusCode.code}\n` +
      `Amount: ${bonusCode.bonusAmount}\n` +
      `Claims: ${bonusCode.totalClaims}\n` +
      `Expires: ${bonusCode.expiresAt.toLocaleDateString()}`
    );
  } catch (error) {
    log("error", `Error creating bonus code: ${error instanceof Error ? error.message : String(error)}`);
    await safeSendMessage(msg.chat.id, "❌ Error creating bonus code.");
  }
}

async function handleCreateChallenge(msg: TelegramBot.Message, params?: string) {
  if (!msg.from?.id) return;
  
  const isAdmin = await checkIsAdmin(msg.from.id.toString());
  if (!isAdmin) {
    return safeSendMessage(msg.chat.id, "❌ This command is for admins only.");
  }

  if (!params) {
    return safeSendMessage(msg.chat.id, "❌ Please provide challenge parameters.");
  }

  try {
    const [game, minBet, multiplier, prizeAmount, maxWinners, days, description] = params.split('|');
    
    if (!game || !minBet || !prizeAmount || !maxWinners || !days) {
      return safeSendMessage(msg.chat.id, "❌ Missing required parameters.");
    }

    const timeframe = new Date();
    timeframe.setDate(timeframe.getDate() + parseInt(days));

    const [challenge] = await db
      .insert(challenges)
      .values({
        game,
        minBet,
        multiplier: multiplier || null,
        prizeAmount,
        maxWinners: parseInt(maxWinners),
        timeframe,
        description: description || null,
        status: 'active',
        source: 'telegram',
        createdBy: msg.from.id
      })
      .returning();

    await safeSendMessage(msg.chat.id,
      `✅ Challenge created successfully!\n\n` +
      `Game: ${challenge.game}\n` +
      `Min Bet: ${challenge.minBet}\n` +
      `Prize: ${challenge.prizeAmount}\n` +
      `Winners: ${challenge.maxWinners}\n` +
      `Expires: ${challenge.timeframe.toLocaleDateString()}`
    );
  } catch (error) {
    log("error", `Error creating challenge: ${error instanceof Error ? error.message : String(error)}`);
    await safeSendMessage(msg.chat.id, "❌ Error creating challenge.");
  }
}

async function handleCallbackQuery(callbackQuery: TelegramBot.CallbackQuery) {
  if (!botInstance) return;

  const chatId = callbackQuery.message?.chat.id;
  const messageId = callbackQuery.message?.message_id;
  const data = callbackQuery.data;
  const userId = callbackQuery.from.id;

  if (!chatId || !messageId || !data) return;

  // Handle bonus code creation
  if (data === 'bonus_start') {
    const state = creationStates.get(userId);
    if (state?.type === 'bonus') {
      creationStates.set(userId, { ...state, step: 'code' });
      await botInstance.editMessageText(
        "🎁 *Enter Bonus Code*\n\n" +
        "Please enter the bonus code (e.g., WELCOME100).\n" +
        "Reply to this message with the code.",
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown"
        }
      );
    }
  }

  // Handle challenge creation
  if (data === 'challenge_start') {
    const state = creationStates.get(userId);
    if (state?.type === 'challenge') {
      creationStates.set(userId, { ...state, step: 'game' });
      const markup = {
        inline_keyboard: [
          [
            { text: "🎰 Slots", callback_data: "game_slots" },
            { text: "🎲 Dice", callback_data: "game_dice" }
          ],
          [
            { text: "🎯 Crash", callback_data: "game_crash" },
            { text: "🃏 Blackjack", callback_data: "game_blackjack" }
          ]
        ]
      };
      
      await botInstance.editMessageText(
        "🎯 *Select Game Type*\n\n" +
        "Choose the game type for this challenge:",
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: markup
        }
      );
    }
  }

  // Handle game selection for challenge
  if (data.startsWith('game_')) {
    const state = creationStates.get(userId);
    if (state?.type === 'challenge') {
      const game = data.replace('game_', '');
      creationStates.set(userId, { ...state, step: 'minBet', game });
      await botInstance.editMessageText(
        "💰 *Enter Minimum Bet*\n\n" +
        "Please enter the minimum bet amount (e.g., $50).\n" +
        "Reply to this message with the amount.",
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown"
        }
      );
    }
  }

  if (data.startsWith('approve_') || data.startsWith('reject_')) {    const [action, username] = data.split('_');
    const isAdmin = await checkIsAdmin(callbackQuery.from.id.toString());

    if (!isAdmin) {
      return botInstance.answerCallbackQuery(callbackQuery.id, {
        text: '❌ Only admins can perform this action',
        show_alert: true
      });
    }

    if (action === 'approve') {
      await handleApprove({ from: callbackQuery.from, chat: { id: chatId } } as TelegramBot.Message, username);
    } else {
      await handleReject({ from: callbackQuery.from, chat: { id: chatId } } as TelegramBot.Message, username);
    }

    await botInstance.answerCallbackQuery(callbackQuery.id);
    await botInstance.deleteMessage(chatId, messageId);
  } else if (data === 'refresh_leaderboard') {
    await handleLeaderboardRefresh(chatId, messageId);
    await botInstance.answerCallbackQuery(callbackQuery.id);
  }
}



async function sendMessageWithEmoji(bot: TelegramBot, chatId: number, emoji: string, message: string, options?: any) {
  await bot.sendMessage(chatId, `${emoji} ${message}`, options);
}



async function handleMessage(msg: TelegramBot.Message) {
  // Add your message handling logic here

}

async function handleChannelPost(msg: TelegramBot.Message) {
    // Add your channel post handling logic here

}

// Remove duplicate exports and consolidate them
const botUtils = {
  getBot,
  handleUpdate,
  initializeBot
};

export default botUtils;