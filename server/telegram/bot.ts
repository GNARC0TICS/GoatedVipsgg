declare module "node-telegram-bot-api" {
  interface ChatPermissions {
    can_send_messages?: boolean;
    can_send_media_messages?: boolean;
    can_send_other_messages?: boolean;
    can_add_web_page_previews?: boolean;
  }

  interface TelegramBot {
    botInfo?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username: string;
      can_join_groups: boolean;
      can_read_all_group_messages: boolean;
      supports_inline_queries: boolean;
    };
    kickChatMember(chatId: number | string, userId: number): Promise<boolean>;
    restrictChatMember(
      chatId: number | string,
      userId: number,
      permissions: Partial<ChatPermissions>
    ): Promise<boolean>;
    emit(event: "message", message: TelegramBot.Message): boolean;
    emit(event: "callback_query", query: TelegramBot.CallbackQuery): boolean;
    emit(event: string, ...args: any[]): boolean;
  }
}

import TelegramBot from "node-telegram-bot-api";
import fetch from "node-fetch";
import schedule from "node-schedule";
import { db } from "@db";
import { telegramUsers, verificationRequests } from "@db/schema/telegram";
import { users } from "@db/schema";
import { API_CONFIG } from "../config/api";
import { eq } from "drizzle-orm";
import { transformLeaderboardData } from "../utils/leaderboard";

//#region Extended Types & Constants

// Enhanced type definition for TelegramBot

//const RECONNECT_DELAY = 3000;
//const MAX_RECONNECT_ATTEMPTS = 8;
//const RECONNECT_BACKOFF_MULTIPLIER = 1.5;
//const WEBHOOK_URL = "https://goatedvips.replit.app/webhook";
//const DEBUG = process.env.NODE_ENV !== "production";
//const BOT_ADMIN_ID = process.env.TELEGRAM_ADMIN_ID
//  ? parseInt(process.env.TELEGRAM_ADMIN_ID)
//  : 1689953605;
//const GROUP_MESSAGE_TYPES = ["group", "supergroup"];
//const HEALTH_CHECK_INTERVAL = 15000; // 15 sec
//const HEALTH_CHECK_TIMEOUT = 5000; // 5 sec
//const MAX_HEALTH_CHECK_FAILURES = 5;
//const GROUP_CHAT_ID = process.env.GROUP_CHAT_ID ? parseInt(process.env.GROUP_CHAT_ID) : undefined;

// This Set will track all group IDs where the bot is present (for recurring broadcasts)
//const groupChatIds = new Set<number>();

// In-memory storage for warnings and permanent bans
//const warningsMap = new Map<string, number>();
//const bannedUsers = new Set<number>();

//#endregion

//#region Utility Functions

//const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

//const debugLog = (...args: any[]) => {
//  const timestamp = new Date().toISOString();
//  if (DEBUG) {
//    console.log(`[Telegram Bot Debug ${timestamp}]`, ...args);
//  } else if (typeof args[0] === "string" && (args[0].includes("Error") || args[0].includes("❌"))) {
//    console.error(`[Telegram Bot Error ${timestamp}]`, ...args);
//  }
//};

// For commands that only the main admin should run
//const isMainAdmin = (userId: number) => userId === BOT_ADMIN_ID;

// Check if a user is an admin in the current chat (or the main admin)
//async function isUserGroupAdmin(chatId: number, userId: number): Promise<boolean> {
//  if (userId === BOT_ADMIN_ID) return true;
//  try {
//    const admins = await botInstance!.getChatAdministrators(chatId);
//    return admins.some((admin) => admin.user.id === userId);
//  } catch (e) {
//    console.error("Error checking admin status", e);
//    return false;
//  }
//}

//#endregion

//#region Singleton Bot & Initialization

//let botInstance: TelegramBot | null = null;
//let isInitializing = false;
//let isReconnecting = false;
//let reconnectAttempts = 0;

//const initializeBot = async (): Promise<TelegramBot | null> => {
//  if (!process.env.TELEGRAM_BOT_TOKEN) {
//    console.error("❌ TELEGRAM_BOT_TOKEN is not set!");
//    return null;
//  }

//  if (isInitializing) {
//    debugLog("Bot initialization already in progress...");
//    return botInstance;
//  }
//  if (botInstance) return botInstance;

//  isInitializing = true;

//  try {
//    debugLog("Initializing bot...");

//    // Clear any existing webhook
//    const tempBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
//    const webhookInfo = await tempBot.getWebHookInfo();
//    if (webhookInfo.url) {
//      await tempBot.deleteWebHook();
//      await sleep(2000);
//    }

//    // Create new instance and set webhook with improved options
//    botInstance = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
//    await botInstance.setWebHook(WEBHOOK_URL, {
//      allowed_updates: ["message", "callback_query", "chat_member", "my_chat_member"],
//      max_connections: 100,
//    });
//    console.log("✅ Webhook set successfully to:", WEBHOOK_URL);

//    // Get and store bot info
//    const botInfo = await botInstance.getMe();
//    botInstance.botInfo = botInfo;

//    setupBotEventHandlers();
//    setupCommandHandlers();

//    debugLog("Bot initialized successfully");
//    isInitializing = false;
//    return botInstance;
//  } catch (error) {
//    console.error("❌ Bot initialization failed:", error);
//    isInitializing = false;
//    botInstance = null;
//    return null;
//  }
//};

//#endregion

//#region Priority Queue & Rate Limiter

//type Priority = "high" | "medium" | "low";
//interface QueueItem {
//  priority: Priority;
//  task: () => Promise<void>;
//  timestamp: number;
//}

//class PriorityMessageQueue {
//  private queue: Map<number, QueueItem[]> = new Map();
//  private processing: Map<number, boolean> = new Map();
//  private readonly RATE_LIMITS: Record<Priority, number> = {
//    high: 300, // ~3 messages/sec
//    medium: 600, // ~2 messages/sec
//    low: 1000, // 1 message/sec
//  };

//  async add(chatId: number, task: () => Promise<void>, priority: Priority = "medium") {
//    const items = this.queue.get(chatId) || [];
//    items.push({ priority, task, timestamp: Date.now() });
//    items.sort((a, b) =>
//      this.RATE_LIMITS[b.priority] - this.RATE_LIMITS[a.priority] || a.timestamp - b.timestamp
//    );
//    this.queue.set(chatId, items);
//    if (!this.processing.get(chatId)) {
//      await this.process(chatId);
//    }
//  }

//  private async process(chatId: number) {
//    if (!this.queue.has(chatId)) return;
//    this.processing.set(chatId, true);
//    const items = this.queue.get(chatId)!;
//    while (items.length > 0) {
//      const item = items[0];
//      try {
//        await item.task();
//        await sleep(this.RATE_LIMITS[item.priority]);
//      } catch (error) {
//        debugLog(`Error processing queue item for ${chatId}:`, error);
//      }
//      items.shift();
//    }
//    this.processing.set(chatId, false);
//    this.queue.delete(chatId);
//  }
//}

//class RateLimiter {
//  private limits: Map<number, number> = new Map();
//  private readonly WINDOW = 60000; // 1 minute
//  private readonly MAX_MESSAGES = 30;

//  async checkLimit(chatId: number): Promise<boolean> {
//    const now = Date.now();
//    const count = this.limits.get(chatId) || 0;
//    if (count >= this.MAX_MESSAGES) return false;
//    this.limits.set(chatId, count + 1);
//    setTimeout(() => {
//      this.limits.set(chatId, (this.limits.get(chatId) || 1) - 1);
//    }, this.WINDOW);
//    return true;
//  }
//}

//const messageQueue = new PriorityMessageQueue();
//const rateLimiter = new RateLimiter();

//#endregion

//#region Health Check & Reconnection

//let healthCheckFailures = 0;

//const handleReconnection = async () => {
//  if (!botInstance || isReconnecting || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;
//  isReconnecting = true;
//  reconnectAttempts++;
//  console.log(`🔄 Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
//  try {
//    await sleep(RECONNECT_DELAY);
//    const botInfo = await botInstance.getMe();
//    botInstance.botInfo = botInfo;
//    isReconnecting = false;
//    healthCheckFailures = 0;
//    console.log("✅ Reconnection successful");
//  } catch (error) {
//    console.error("❌ Reconnection failed:", error);
//    isReconnecting = false;
//    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
//      setTimeout(handleReconnection, RECONNECT_DELAY * RECONNECT_BACKOFF_MULTIPLIER);
//    } else {
//      console.error("❌ Max reconnection attempts reached. Manual intervention required.");
//      safeSendMessage(BOT_ADMIN_ID, "⚠️ Bot reconnection failed after maximum attempts. Please check the logs.");
//    }
//  }
//};

//const startHealthCheck = () => {
//  if (!botInstance) return;
//  let consecutiveFailures = 0;
//  const RECOVERY_DELAY = 5000;
//  setInterval(async () => {
//    try {
//      const webhookInfo = await botInstance!.getWebHookInfo();
//      if (webhookInfo.url) {
//        healthCheckFailures = 0;
//        debugLog("Webhook health check passed");
//      } else {
//        throw new Error("Webhook not set");
//      }
//    } catch (error) {
//      console.error("Webhook health check error:", error);
//      healthCheckFailures++;
//      debugLog(`Health check failed (${healthCheckFailures}/${MAX_HEALTH_CHECK_FAILURES})`);
//      if (healthCheckFailures >= MAX_HEALTH_CHECK_FAILURES) {
//        debugLog("Max health check failures reached - Attempting webhook reset");
//        await initializeBot();
//      }
//    }
//  }, HEALTH_CHECK_INTERVAL);
//};

//#endregion

//#region Bot Event Handlers

//const setupBotEventHandlers = () => {
//  if (!botInstance) return;

//  botInstance.on("message", handleMessage);
//  botInstance.on("callback_query", handleCallbackQuery);

//  botInstance.on("my_chat_member", async (chatMember) => {
//    const { chat, new_chat_member } = chatMember;
//    debugLog("Chat member status update:", {
//      chatId: chat.id,
//      type: chat.type,
//      newStatus: new_chat_member.status,
//    });
//    // When added to a group, store the group ID (for recurring broadcasts)
//    if (GROUP_MESSAGE_TYPES.includes(chat.type)) {
//      groupChatIds.add(chat.id);
//      if (new_chat_member.status === "administrator") {
//        await safeSendMessage(chat.id, `✅ Thank you for making me an admin! I'm now fully operational.`, {}, "high");
//      } else if (new_chat_member.status === "member") {
//        await safeSendMessage(chat.id, `⚠️ Please note: I need admin rights to function properly.`, {}, "high");
//      }
//    }
//  });

//  // Polling and error handling
//  botInstance.on("polling_error", (error) => {
//    console.error("Polling error:", error);
//    healthCheckFailures++;
//    if (healthCheckFailures >= MAX_HEALTH_CHECK_FAILURES) handleReconnection();
//  });

//  botInstance.on("error", (error) => {
//    console.error("Bot error:", error);
//    healthCheckFailures++;
//    if (healthCheckFailures >= MAX_HEALTH_CHECK_FAILURES) handleReconnection();
//  });
//};

//const setupCommandHandlers = () => {
//  if (!botInstance) return;

//  // Matches commands with optional arguments
//  botInstance.onText(
//    /\/(start|help|verify|stats|leaderboard|race|play|website|check_stats|adminpanel|broadcast|message|createchallenge|createbonus|launchchallenge|available|setrecurring|ban|mute|unmute|warn|bootfuck|getinfo)(?:@[\w]+)?(?: (.+))?/,
//    async (msg, match) => {
//      if (!match) return;
//      const command = `/${match[1]}`;
//      const args = match[2] ? match[2].split(" ") : [];
//      handleCommand(command, msg, args);
//    }
//  );

//  // Admin-only verification approval
//  botInstance.onText(/\/approve (.+)/, async (msg, match) => {
//    if (!(await isUserGroupAdmin(msg.chat.id, msg.from!.id))) {
//      return safeSendMessage(msg.chat.id, "❌ This command is only available to group admins.");
//    }
//    const telegramUsername = match?.[1]?.trim().replace("@", "");
//    if (!telegramUsername) {
//      return safeSendMessage(msg.chat.id, "Usage: /approve @username");
//    }
//    try {
//      const [request] = await db
//        .select()
//        .from(verificationRequests)
//        .where(eq(verificationRequests.telegramUsername, telegramUsername))
//        .limit(1);
//      if (!request) {
//        return safeSendMessage(msg.chat.id, "❌ No pending verification request found for this user.");
//      }
//      await db
//        .update(verificationRequests)
//        .set({ status: "approved" })
//        .where(eq(verificationRequests.telegramUsername, telegramUsername));
//      await db
//        .insert(telegramUsers)
//        .values({
//          telegramId: request.telegramId,
//          telegramUsername: telegramUsername,
//          userId: request.userId,
//          isVerified: true,
//        })
//        .onConflictDoUpdate({
//          target: [telegramUsers.telegramId],
//          set: {
//            telegramUsername: telegramUsername,
//            userId: request.userId,
//            isVerified: true,
//          },
//        });
//      const [user] = await db
//        .select()
//        .from(users)
//        .where(eq(users.id, request.userId))
//        .limit(1);
//      await safeSendMessage(msg.chat.id, `✅ Verified @${telegramUsername} as ${user.username}`);
//      await safeSendMessage(parseInt(request.telegramId), "✅ Your account has been verified! You can now use /stats to check your statistics.");
//    } catch (error) {
//      console.error("Approval error:", error);
//      await safeSendMessage(msg.chat.id, "❌ Error processing approval.");
//    }
//  });

//  // Admin command to view pending verification requests
//  botInstance.onText(/\/pending/, async (msg) => {
//    if (!(await isUserGroupAdmin(msg.chat.id, msg.from!.id))) {
//      return safeSendMessage(msg.chat.id, "❌ This command is only available to group admins.");
//    }
//    try {
//      const pendingRequests = await db
//        .select({
//          id: verificationRequests.id,
//          telegramUsername: verificationRequests.telegramUsername,
//          userId: verificationRequests.userId,
//          requestedAt: verificationRequests.requestedAt,
//          username: users.username,
//        })
//        .from(verificationRequests)
//        .innerJoin(users, eq(users.id, verificationRequests.userId))
//        .where(eq(verificationRequests.status, "pending"));

//      if (pendingRequests.length === 0) {
//        return safeSendMessage(msg.chat.id, "✅ No pending verification requests.", {}, "high");
//      }
//      for (const request of pendingRequests) {
//        const message = `🔍 Verification Request #${request.id}
//👤 Telegram: @${request.telegramUsername || "N/A"}
//🎮 Goated: ${request.username}
//⏰ Requested: ${new Date(request.requestedAt).toLocaleString()}`;
//        const inlineKeyboard = {
//          reply_markup: {
//            inline_keyboard: [
//              [
//                { text: "✅ Approve", callback_data: `approve_${request.id}` },
//                { text: "❌ Reject", callback_data: `reject_${request.id}` },
//              ],
//            ],
//          },
//        };
//        await safeSendMessage(msg.chat.id, message, inlineKeyboard, "high");
//      }
//    } catch (error) {
//      console.error("Error fetching pending requests:", error);
//      await safeSendMessage(msg.chat.id, "❌ Error fetching pending requests.");
//    }
//  });
//};

//#endregion

//#region Challenge & Bonus Code Creation Feature

//interface ChallengeCreationState {
//  step: number;
//  game?: string;
//  minBet?: string;
//  multiplier?: string;
//  prize?: string;
//  numClaims?: number;
//  timeframe?: string;
//  bonusCode?: string;
//}

//interface BonusCreationState {
//  step: number;
//  bonusAmount?: string;
//  requiredWager?: string;
//  totalClaims?: number;
//  bonusCode?: string;
//}

//const challengeCreationStates = new Map<number, ChallengeCreationState>();
//const bonusCreationStates = new Map<number, BonusCreationState>();

// Temporary storage for the last created challenge – in production, save to your DB
//let lastCreatedChallenge: ChallengeCreationState | null = null;

//function startChallengeCreation(chatId: number) {
//  challengeCreationStates.set(chatId, { step: 1 });
//  // Send inline keyboard for game selection
//  const games = [
//    "GOAT RUN",
//    "G3 TOWER",
//    "DIAMONDS",
//    "DICE",
//    "KENO",
//    "BLACKJACK",
//    "PLINKO",
//    "LIMBO",
//    "MINES",
//    "WHEEL",
//    "CRASH",
//    "G3 CARDS",
//  ];
//  const keyboard = games.map((game) => ({ text: game, callback_data: `challenge_game_${game}` }));
//  // Group buttons in rows of 3
//  const rows = [];
//  for (let i = 0; i < keyboard.length; i += 3) {
//    rows.push(keyboard.slice(i, i + 3));
//  }
//  safeSendMessage(chatId, "Select the game for the challenge:", { reply_markup: { inline_keyboard: rows } });
//}

//function startBonusCreation(chatId: number) {
//  bonusCreationStates.set(chatId, { step: 1 });
//  safeSendMessage(chatId, "Enter the bonus amount (e.g., $10):");
//}

//function processChallengeCreationInput(chatId: number, text: string) {
//  const state = challengeCreationStates.get(chatId);
//  if (!state) return;
//  switch (state.step) {
//    case 3:
//      state.multiplier = text.trim();
//      state.step = 4;
//      safeSendMessage(chatId, "Enter the prize amount (e.g., $50):");
//      break;
//    case 4:
//      state.prize = text.trim();
//      state.step = 5;
//      safeSendMessage(chatId, "Enter the number of claims:");
//      break;
//    case 5:
//      const num = parseInt(text.trim());
//      if (isNaN(num)) {
//        safeSendMessage(chatId, "Please enter a valid number for claims:");
//        return;
//      }
//      state.numClaims = num;
//      state.step = 6;
//      safeSendMessage(chatId, "Enter the competition timeframe (e.g., 2025-02-15 18:00):");
//      break;
//    case 6:
//      state.timeframe = text.trim();
//      state.step = 7;
//      safeSendMessage(chatId, "Enter the bonus code to be given upon completion:");
//      break;
//    case 7:
//      state.bonusCode = text.trim();
//      state.step = 8;
//      // Show confirmation
//      const confirmationText = `Please confirm the challenge details:
//Game: ${state.game}
//Min Bet: ${state.minBet}
//Multiplier: ${state.multiplier}x
//Prize: ${state.prize}
//Number of Claims: ${state.numClaims}
//Timeframe: ${state.timeframe}
//Bonus Code: ${state.bonusCode}`;
//      const keyboard = {
//        reply_markup: {
//          inline_keyboard: [
//            [{ text: "Confirm Challenge", callback_data: "challenge_confirm" }],
//            [{ text: "Cancel", callback_data: "challenge_cancel" }],
//          ],
//        },
//      };
//      safeSendMessage(chatId, confirmationText, keyboard);
//      break;
//    default:
//      break;
//  }
//}

//function processBonusCreationInput(chatId: number, text: string) {
//  const state = bonusCreationStates.get(chatId);
//  if (!state) return;
//  switch (state.step) {
//    case 1:
//      state.bonusAmount = text.trim();
//      state.step = 2;
//      safeSendMessage(chatId, "Enter the required wager amount over the past 7 days:");
//      break;
//    case 2:
//      state.requiredWager = text.trim();
//      state.step = 3;
//      safeSendMessage(chatId, "Enter the total number of claims allowed:");
//      break;
//    case 3:
//      const num = parseInt(text.trim());
//      if (isNaN(num)) {
//        safeSendMessage(chatId, "Please enter a valid number for total claims:");
//        return;
//      }
//      state.totalClaims = num;
//      state.step = 4;
//      safeSendMessage(chatId, "Enter the bonus code:");
//      break;
//    case 4:
//      state.bonusCode = text.trim();
//      state.step = 5;
//      const confirmationText = `Please confirm the bonus code details:
//Bonus Amount: ${state.bonusAmount}
//Required Wager: ${state.requiredWager}
//Total Claims: ${state.totalClaims}
//Bonus Code: ${state.bonusCode}`;
//      const keyboard = {
//        reply_markup: {
//          inline_keyboard: [
//            [{ text: "Confirm Bonus", callback_data: "bonus_confirm" }],
//            [{ text: "Cancel", callback_data: "bonus_cancel" }],
//          ],
//        },
//      };
//      safeSendMessage(chatId, confirmationText, keyboard);
//      break;
//    default:
//      break;
//  }
//}

//#endregion

//#region Callback Query Handler

//const handleCallbackQuery = async (query: TelegramBot.CallbackQuery): Promise<void> => {
//  if (!botInstance || !query.message) return;
//  const chatId = query.message.chat.id;

//  try {
//    // New admin panel actions
//    if (query.data === "create_challenge") {
//      if (!(await isUserGroupAdmin(chatId, query.from!.id))) return;
//      startChallengeCreation(chatId);
//      await botInstance.answerCallbackQuery(query.id, { text: "Starting challenge creation..." });
//      return;
//    }
//    if (query.data === "create_bonus") {
//      if (!(await isUserGroupAdmin(chatId, query.from!.id))) return;
//      startBonusCreation(chatId);
//      await botInstance.answerCallbackQuery(query.id, { text: "Starting bonus code creation..." });
//      return;
//    }
//    // Handle game selection for challenge creation
//    if (query.data.startsWith("challenge_game_")) {
//      const game = query.data.replace("challenge_game_", "");
//      const state = challengeCreationStates.get(chatId);
//      if (!state) return;
//      state.game = game;
//      state.step = 2;
//      // Send inline keyboard for min bet options
//      const minBetOptions = ["None", ".01", ".10", ".25", "$1", "$2"];
//      const keyboard = {
//        reply_markup: {
//          inline_keyboard: minBetOptions.map((opt) => [{ text: opt, callback_data: `challenge_minbet_${opt}` }]),
//        },
//      };
//      await safeSendMessage(chatId, `Selected game: ${game}\nNow, choose the minimum bet amount:`, keyboard);
//      await botInstance.answerCallbackQuery(query.id);
//      return;
//    }
//    // Handle minimum bet selection
//    if (query.data.startsWith("challenge_minbet_")) {
//      const minBet = query.data.replace("challenge_minbet_", "");
//      const state = challengeCreationStates.get(chatId);
//      if (!state) return;
//      state.minBet = minBet;
//      state.step = 3;
//      await safeSendMessage(chatId, `Selected minimum bet: ${minBet}\nPlease enter the multiplier (e.g., 2 for 2x):`);
//      await botInstance.answerCallbackQuery(query.id);
//      return;
//    }
//    // Confirmation for challenge creation
//    if (query.data === "challenge_confirm") {
//      const state = challengeCreationStates.get(chatId);
//      if (!state) return;
//      // In a real implementation, save the challenge to your DB here.
//      lastCreatedChallenge = { ...state };
//      challengeCreationStates.delete(chatId);
//      await safeSendMessage(chatId, "✅ Challenge created successfully!\nYou can now launch the challenge using the /launchchallenge command.");
//      await botInstance.answerCallbackQuery(query.id, { text: "Challenge confirmed." });
//      return;
//    }
//    if (query.data === "challenge_cancel") {
//      challengeCreationStates.delete(chatId);
//      await safeSendMessage(chatId, "❌ Challenge creation canceled.");
//      await botInstance.answerCallbackQuery(query.id, { text: "Challenge creation canceled." });
//      return;
//    }
//    // Confirmation for bonus creation
//    if (query.data === "bonus_confirm") {
//      const state = bonusCreationStates.get(chatId);
//      if (!state) return;
//      // In a real implementation, save the bonus code to your DB here.
//      bonusCreationStates.delete(chatId);
//      await safeSendMessage(chatId, "✅ Bonus code created successfully!");
//      await botInstance.answerCallbackQuery(query.id, { text: "Bonus confirmed." });
//      return;
//    }
//    if (query.data === "bonus_cancel") {
//      bonusCreationStates.delete(chatId);
//      await safeSendMessage(chatId, "❌ Bonus code creation canceled.");
//      await botInstance.answerCallbackQuery(query.id, { text: "Bonus creation canceled." });
//      return;
//    }

//    // Existing inline commands mapping
//    const callbackToCommand: Record<string, string> = {
//      my_stats: "/stats",
//      refresh_leaderboard: "/leaderboard",
//      verify: "/verify",
//      stats: "/stats",
//      leaderboard: "/leaderboard",
//      help: "/help",
//      play: "/play",
//      admin_broadcast: "/broadcast",
//      admin_message: "/message",
//      admin_pending: "/pending",
//    };

//    if (query.data && callbackToCommand[query.data]) {
//      botInstance.emit("message", {
//        ...query.message,
//        text: callbackToCommand[query.data],
//        entities: [{ offset: 0, length: callbackToCommand[query.data].length, type: "bot_command" }],
//      });
//    }
//    await botInstance.answerCallbackQuery(query.id);
//  } catch (error) {
//    debugLog("Error handling callback query:", error);
//    await botInstance.answerCallbackQuery(query.id, {
//      text: "❌ Error processing request",
//      show_alert: true,
//    });
//  }
//};

//#endregion

//#region Message Handler

//const handleMessage = async (msg: TelegramBot.Message) => {
//  if (!botInstance) return;
//  const chatId = msg.chat.id;

//  // Track group chat IDs for recurring broadcasts
//  if (GROUP_MESSAGE_TYPES.includes(msg.chat.type)) {
//    groupChatIds.add(chatId);
//  }

//  // If admin sends /cancel while in a creation flow, cancel it.
//  if (msg.text && isMainAdmin(msg.from!.id) && msg.text.trim() === "/cancel") {
//    if (challengeCreationStates.has(chatId)) {
//      challengeCreationStates.delete(chatId);
//      safeSendMessage(chatId, "Challenge creation canceled.");
//      return;
//    }
//    if (bonusCreationStates.has(chatId)) {
//      bonusCreationStates.delete(chatId);
//      safeSendMessage(chatId, "Bonus code creation canceled.");
//      return;
//    }
//  }

//  // If admin is in the middle of a challenge/bonus creation flow, process the input.
//  if (msg.text && (await isUserGroupAdmin(chatId, msg.from!.id))) {
//    if (challengeCreationStates.has(chatId) && !msg.text.startsWith("/")) {
//      processChallengeCreationInput(chatId, msg.text);
//      return;
//    }
//    if (bonusCreationStates.has(chatId) && !msg.text.startsWith("/")) {
//      processBonusCreationInput(chatId, msg.text);
//      return;
//    }
//  }

//  try {
//    const isGroupChat = GROUP_MESSAGE_TYPES.includes(msg.chat.type);
//    debugLog(`Message from ${msg.from?.username || "Unknown"} in ${msg.chat.type}`);

//    // Handle commands (text starting with '/')
//    if (msg.text?.startsWith("/")) {
//      const command = msg.text.split(" ")[0].split("@")[0];
//      const args = msg.text.split(" ").slice(1);
//      await handleCommand(command, msg, args);
//      return;
//    }

//    // Group-specific behavior: welcome when added
//    if (isGroupChat && msg.new_chat_members?.some((member) => member.id === botInstance!.botInfo?.id)) {
//      await safeSendMessage(
//        chatId,
//        `👋 Thanks for adding me! Please make me an admin to ensure proper functionality.\n\nUse /help to see available commands.`,
//        {},
//        "high"
//      );
//    }
//  } catch (error) {
//    console.error("Error handling message:", error);
//  }
//};

//#endregion

//#region Command Handler

//const handleCommand = async (command: string, msg: TelegramBot.Message, args: string[]) => {
//  if (!botInstance) return;
//  const chatId = msg.chat.id;

//  if (!(await rateLimiter.checkLimit(chatId))) {
//    return safeSendMessage(chatId, "⚠️ Rate limit exceeded. Please wait a moment before trying again.");
//  }
//  const isGroupChat = GROUP_MESSAGE_TYPES.includes(msg.chat.type);
//  try {
//    switch (command) {
//      // ---------------- Admin-Only (Main Admin) Commands ----------------
//      case "/message":
//        if (!isMainAdmin(msg.from!.id)) {
          return safeSendMessage(chatId, "❌ This command is only available to the main admin.");
        }
        {
          const username = args[0]?.replace("@", "");
          const message = args.slice(1).join(" ");
          if (!username || !message) {
            return safeSendMessage(chatId, "❌ Usage: /message @username your message");
          }
          const [targetUser] = await db
            .select()
            .from(telegramUsers)
            .where(eq(telegramUsers.telegramUsername, username))
            .limit(1);
          if (!targetUser) {
            return safeSendMessage(chatId, "❌ User not found or not verified.");
          }
          try {
            await safeSendMessage(parseInt(targetUser.telegramId), `✉️ Message from Admin:\n\n${message}`, {}, "high");
            await safeSendMessage(chatId, `✅ Message sent to @${username} successfully!`);
          } catch (error) {
            console.error(`Failed to message ${username}:`, error);
            await safeSendMessage(chatId, `❌ Failed to send message to @${username}. They may have blocked the bot.`);
          }
        }
        break;

      case "/createchallenge":
        if (!isMainAdmin(msg.from!.id)) {
          return safeSendMessage(chatId, "❌ This command is only available to the main admin.");
        }
        startChallengeCreation(chatId);
        break;

      case "/createbonus":
        if (!isMainAdmin(msg.from!.id)) {
          return safeSendMessage(chatId, "❌ This command is only available to the main admin.");
        }
        startBonusCreation(chatId);
        break;

      case "/launchchallenge":
        if (!isMainAdmin(msg.from!.id)) {
          return safeSendMessage(chatId, "❌ This command is only available to the main admin.");
        }
        if (!lastCreatedChallenge) {
          return safeSendMessage(chatId, "❌ No challenge is ready to launch.");
        }
        {
          const challenge = lastCreatedChallenge;
          const launchMessage = `🎯 **New Challenge Launched!**
Game: ${challenge.game}
Min Bet: ${challenge.minBet}
Multiplier: ${challenge.multiplier}x
Prize: ${challenge.prize}
Number of Claims: ${challenge.numClaims}
Timeframe: ${challenge.timeframe}

To participate, reply with #challenge and include your bet-link from goated.com and tag the admin.`;
          if (GROUP_CHAT_ID) {
            await safeSendMessage(GROUP_CHAT_ID, launchMessage);
            safeSendMessage(chatId, "Challenge launched successfully!");
            lastCreatedChallenge = null;
          } else {
            safeSendMessage(chatId, "❌ GROUP_CHAT_ID is not set.");
          }
        }
        break;

      // ---------------- Commands Available to Any Group Admin ----------------
      case "/broadcast":
        if (!(await isUserGroupAdmin(chatId, msg.from!.id))) {
          return safeSendMessage(chatId, "❌ This command is only available to group admins.");
        }
        await safeSendMessage(chatId, "📢 Enter the message you want to broadcast:");
        botInstance.once("message", async (response) => {
          if (!response.text) return;
          const usersList = await db.select().from(telegramUsers);
          let successCount = 0;
          let failureCount = 0;
          for (const user of usersList) {
            try {
              await safeSendMessage(parseInt(user.telegramId), `📢 Announcement:\n\n${response.text}`, {}, "high");
              successCount++;
            } catch (error) {
              console.error(`Failed to send to ${user.telegramId}:`, error);
              failureCount++;
            }
          }
          await safeSendMessage(chatId, `✅ Broadcast complete!\n📤 Delivered: ${successCount}\n❌ Failed: ${failureCount}`);
        });
        break;

      case "/ban": {
        if (!(await isUserGroupAdmin(chatId, msg.from!.id))) {
          return safeSendMessage(chatId, "❌ You must be a group admin to use this command.");
        }
        let targetId: number;
        if (msg.reply_to_message && msg.reply_to_message.from) {
          targetId = msg.reply_to_message.from.id;
        } else if (args[0] && !isNaN(parseInt(args[0]))) {
          targetId = parseInt(args[0]);
        } else {
          return safeSendMessage(chatId, "Please reply to a user's message or provide their numeric ID.");
        }
        try {
          await botInstance.kickChatMember(chatId, targetId);
          safeSendMessage(chatId, `User ${targetId} has been banned.`);
        } catch (err) {
          safeSendMessage(chatId, "❌ Failed to ban the user.");
        }
        break;
      }

      case "/mute": {
        if (!(await isUserGroupAdmin(chatId, msg.from!.id))) {
          return safeSendMessage(chatId, "❌ You must be a group admin to use this command.");
        }
        let targetId: number;
        if (msg.reply_to_message && msg.reply_to_message.from) {
          targetId = msg.reply_to_message.from.id;
        } else if (args[0] && !isNaN(parseInt(args[0]))) {
          targetId = parseInt(args[0]);
        } else {
          return safeSendMessage(chatId, "Please reply to a user's message or provide their numeric ID.");
        }
        try {
          await botInstance.restrictChatMember(chatId, targetId, {
            permissions: {
              can_send_messages: false,
              can_send_media_messages: false,
              can_send_other_messages: false,
              can_add_web_page_previews: false,
            },
          });
          safeSendMessage(chatId, `User ${targetId} has been muted.`);
        } catch (err) {
          safeSendMessage(chatId, "❌ Failed to mute the user.");
        }
        break;
      }

      case "/unmute": {
        if (!(await isUserGroupAdmin(chatId, msg.from!.id))) {
          return safeSendMessage(chatId, "❌ You must be a group admin to use this command.");
        }
        let targetId: number;
        if (msg.reply_to_message && msg.reply_to_message.from) {
          targetId = msg.reply_to_message.from.id;
        } else if (args[0] && !isNaN(parseInt(args[0]))) {
          targetId = parseInt(args[0]);
        } else {
          return safeSendMessage(chatId, "Please reply to a user's message or provide their numeric ID.");
        }
        try {
          await botInstance.restrictChatMember(chatId, targetId, {
            permissions: {
              can_send_messages: true,
              can_send_media_messages: true,
              can_send_other_messages: true,
              can_add_web_page_previews: true,
            },
          });
          safeSendMessage(chatId, `User ${targetId} has been unmuted.`);
        } catch (err) {
          safeSendMessage(chatId, "❌ Failed to unmute the user.");
        }
        break;
      }

      case "/warn": {
        if (!(await isUserGroupAdmin(chatId, msg.from!.id))) {
          return safeSendMessage(chatId, "❌ You must be a group admin to use this command.");
        }
        let targetId: number;
        if (msg.reply_to_message && msg.reply_to_message.from) {
          targetId = msg.reply_to_message.from.id;
        } else if (args[0] && !isNaN(parseInt(args[0]))) {
          targetId = parseInt(args[0]);
        } else {
          return safeSendMessage(chatId, "Please reply to a user's message or provide their numeric ID.");
        }
        const key = `${chatId}-${targetId}`;
        let count = warningsMap.get(key) || 0;
        count++;
        warningsMap.set(key, count);
        if (count < 3) {
          safeSendMessage(chatId, `User ${targetId} has been warned. (${count}/3)`);
        } else {
          try {
            await botInstance.kickChatMember(chatId, targetId);
            safeSendMessage(chatId, `User ${targetId} has been banned for accumulating 3 warnings.`);
            warningsMap.delete(key);
          } catch (err) {
            safeSendMessage(chatId, "❌ Failed to ban the user after 3 warnings.");
          }
        }
        break;
      }

      case "/bootfuck": {
        if (!(await isUserGroupAdmin(chatId, msg.from!.id))) {
          return safeSendMessage(chatId, "❌ You must be a group admin to use this command.");
        }
        let targetId: number;
        if (msg.reply_to_message && msg.reply_to_message.from) {
          targetId = msg.reply_to_message.from.id;
        } else if (args[0] && !isNaN(parseInt(args[0]))) {
          targetId = parseInt(args[0]);
        } else {
          return safeSendMessage(chatId, "Please reply to a user's message or provide their numeric ID.");
        }
        try {
          await botInstance.kickChatMember(chatId, targetId);
          bannedUsers.add(targetId);
          safeSendMessage(chatId, `User ${targetId} has been bootfucked and permanently banned.`);
          safeSendMessage(chatId, `🚫 User ${targetId} has been bootfucked and permanently banned. Shame on them!`);
        } catch (err) {
          safeSendMessage(chatId, "❌ Failed to bootfuck the user.");
        }
        break;
      }

      case "/getinfo": {
        if (!(await isUserGroupAdmin(chatId, msg.from!.id))) {
          return safeSendMessage(chatId, "❌ You must be a group admin to use this command.");
        }
        let targetId: number;
        if (msg.reply_to_message && msg.reply_to_message.from) {
          targetId = msg.reply_to_message.from.id;
        } else if (args[0] && !isNaN(parseInt(args[0]))) {
          targetId = parseInt(args[0]);
        } else {
          return safeSendMessage(chatId, "Please reply to a user's message or provide their numeric ID.");
        }
        try {
          const info = await botInstance.getChatMember(chatId, targetId);
          const infoText = `User Info:
Name: ${info.user.first_name} ${info.user.last_name || ""}
Username: ${info.user.username || "N/A"}
ID: ${info.user.id}
Status: ${info.status}`;
          safeSendMessage(chatId, infoText);
        } catch (err) {
          safeSendMessage(chatId, "❌ Failed to retrieve user info.");
        }
        break;
      }

      // ---------------- Other Commands ----------------

      case "/start": {
        const welcomeMessage = `🐐 Welcome to Goated Stats Bot!

Admin Commands:
• /broadcast - Broadcast a message (available to any group admin)
• /ban - Ban a user (group admins)
• /mute / /unmute - Mute/unmute a user (group admins)
• /warn - Warn a user (group admins; 3 warnings trigger a ban)
• /bootfuck - Permanently ban a user with a public shame message (group admins)
• /getinfo - Retrieve a user's info (group admins)

Main Admin Only Commands:
• /message - Direct message a user
• /createchallenge - Start challenge creation
• /createbonus - Start bonus code creation
• /launchchallenge - Launch the most recent challenge

Other Commands:
• /verify, /stats, /check_stats, /leaderboard, /play, /website, /available, /setrecurring

Need help? Contact @xGoombas for support.`;
        const startInlineKeyboard = {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "🔐 Verify Account", callback_data: "verify" },
                { text: "📊 My Stats", callback_data: "stats" },
              ],
              [
                { text: "🏆 Leaderboard", callback_data: "leaderboard" },
                { text: "🎮 Play", callback_data: "play" },
              ],
              [
                { text: "🌐 Website", url: "https://GoatedVIPs.gg" },
                { text: "👤 Contact Support", url: "https://t.me/xGoombas" },
              ],
            ],
          },
        };
        await safeSendMessage(chatId, welcomeMessage, startInlineKeyboard);
        break;
      }
      case "/help": {
        const [telegramUser] = await db
          .select()
          .from(telegramUsers)
          .where(eq(telegramUsers.telegramId, chatId.toString()))
          .limit(1);
        const helpText = telegramUser?.isVerified
          ? `📋 Available Commands:
• /stats - View your wager statistics
• /check_stats - Check stats for username
• /race - Check your race position
• /leaderboard - See top players
• /play - Play on Goated
• /website - Visit our website

Need help? Contact @xGoombas for support.`
          : `🔐 Verification Required

To access all features, please verify your Goated account:

1️⃣ Click the button below to start verification
2️⃣ Enter your Goated username
3️⃣ Wait for admin approval (usually within minutes)

Available Commands:
• /verify <username> - Link your account
• /help - Show all commands

Need assistance? Contact @xGoombas`;
        const helpInlineKeyboard = telegramUser?.isVerified
          ? {
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: "📊 My Stats", callback_data: "stats" },
                    { text: "🏆 Leaderboard", callback_data: "leaderboard" },
                  ],
                  [
                    { text: "🌐 Website", url: "https://GoatedVIPs.gg" },
                    { text: "👤 Contact Support", url: "https://t.me/xGoombas" },
                  ],
                ],
              },
            }
          : {};
        await safeSendMessage(chatId, helpText, helpInlineKeyboard);
        break;
      }
      case "/verify":
        await handleVerifyCommand(msg, args);
        break;
      case "/stats":
      case "/check_stats":
        await handleStatsCommand(msg, args);
        break;
      case "/leaderboard":
        await handleLeaderboardCommand(msg);
        break;
      case "/play":
        await safeSendMessage(chatId, "🎮 Enjoy playing on Goated! Get started: <a href='https://www.Goated.com/r/GOATEDVIPS'>here</a>");
        break;
      case "/setrecurring":
        if (!isMainAdmin(msg.from!.id)) {
          return safeSendMessage(chatId, "❌ This command is only available to the main admin.");
        }
        if (args.length < 2) {
          return safeSendMessage(chatId, "Usage: /setrecurring <HH:mm> <message>");
        }
        {
          const timeArg = args[0]; // e.g., "16:00"
          const recurringMessage = args.slice(1).join(" ");
          const [hourStr, minuteStr] = timeArg.split(":");
          const hour = parseInt(hourStr, 10);
          const minute = parseInt(minuteStr, 10);
          if (isNaN(hour) || isNaN(minute)) {
            return safeSendMessage(chatId, "Invalid time format. Use HH:mm (24-hour).");
          }
          // Use the current day-of-week as the scheduled day
          const now = new Date();
          const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday, etc.
          const rule = new schedule.RecurrenceRule();
          rule.dayOfWeek = dayOfWeek;
          rule.hour = hour;
          rule.minute = minute;
          rule.tz = "America/Los_Angeles"; // PST
          schedule.scheduleJob(rule, async () => {
            groupChatIds.forEach(async (groupId) => {
              await safeSendMessage(groupId, recurringMessage);
            });
          });
          await safeSendMessage(chatId, `Recurring message scheduled every ${["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][dayOfWeek]} at ${timeArg} PST.`);
        }
        break;
      default:
        if (isGroupChat && ["verify", "stats", "profile", "check_stats"].includes(command.substring(1))) {
          const privateLink = `https://t.me/${botInstance.botInfo?.username}?start=${command.substring(1)}`;
          await safeSendMessage(chatId, `🔒 For security, please use this command in private:\n${privateLink}`, {}, "high");
        }
        break;
    }
  } catch (error) {
    debugLog(`Error handling command ${command}:`, error);
    await safeSendMessage(chatId, "❌ Error processing command. Please try again later.");
  }
};

//#endregion

//#region Verification, Stats & Leaderboard Handlers

const handleVerificationAction = async (
  action: "approve" | "reject",
  requestId: number,
  adminChatId: number
): Promise<void> => {
  if (!botInstance) return;
  debugLog(`Processing ${action} for request #${requestId}`);
  try {
    const [request] = await db
      .select()
      .from(verificationRequests)
      .where(eq(verificationRequests.id, requestId))
      .limit(1);
    if (!request) throw new Error("Request not found");

    if (action === "approve") {
      await db
        .update(verificationRequests)
        .set({
          status: "approved",
          verifiedAt: new Date(),
          verifiedBy: adminChatId.toString(),
        })
        .where(eq(verificationRequests.id, requestId));
      await db.insert(telegramUsers).values({
        telegramId: request.telegramId,
        telegramUsername: request.telegramUsername || "",
        userId: request.userId,
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: adminChatId.toString(),
      }).onConflictDoUpdate({
        target: [telegramUsers.telegramId],
        set: {
          telegramUsername: request.telegramUsername || "",
          userId: request.userId,
          isVerified: true,
          verifiedAt: new Date(),
          verifiedBy: adminChatId.toString(),
        },
      });
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, request.userId))
        .limit(1);
      if (!user) throw new Error("User not found");
      await safeSendMessage(parseInt(request.telegramId), "✅ Your account has been verified! You can now use /stats to check your statistics.", {}, "high");
    } else {
      await db
        .update(verificationRequests)
        .set({
          status: "rejected",
          verifiedAt: new Date(),
          verifiedBy: adminChatId.toString(),
        })
        .where(eq(verificationRequests.id, requestId));
      await safeSendMessage(parseInt(request.telegramId), "❌ Your verification request has been rejected. Please ensure you provided the correct Goated username and try again.", {}, "high");
    }
  } catch (error) {
    console.error("Error handling verification action:", error);
    throw error;
  }
};

const handleVerifyCommand = async (msg: TelegramBot.Message, args: string[]) => {
  const chatId = msg.chat.id;
  debugLog("📝 Verify command received from:", chatId);
  const [existingRequest] = await db
    .select()
    .from(verificationRequests)
    .where(eq(verificationRequests.telegramId, chatId.toString()))
    .where(eq(verificationRequests.status, "pending"))
    .limit(1);
  if (existingRequest) {
    return safeSendMessage(chatId, "⚠️ You already have a pending verification request. Please wait for admin approval.");
  }
  if (msg.chat.type !== "private") {
    const privateLink = `https://t.me/${botInstance!.botInfo?.username}?start=verify`;
    return safeSendMessage(chatId, `🔒 For security reasons, please verify in private chat:\n${privateLink}`, {}, "high");
  }
  const username = args[0]?.trim();
  if (!username) {
    const instructions = `
🔐 Verification Process:

1️⃣ Type: /verify YOUR_GOATED_USERNAME
   Example: /verify JohnDoe123

2️⃣ Wait for admin review
   • Admins will verify your account
   • You'll receive a confirmation message

3️⃣ After verification:
   • Use /stats to check your statistics
   • View /leaderboard rankings
   • Access exclusive features

Ready? Type /verify followed by your username!`.trim();
    return safeSendMessage(chatId, instructions);
  }
  try {
    const [existingUser] = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramId, chatId.toString()))
      .limit(1);
    if (existingUser && existingUser.isVerified) {
      return safeSendMessage(chatId, "✅ Your account is already verified!");
    }
    // Validate username via external API
    const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}`, {
      headers: {
        Authorization: `Bearer ${process.env.API_TOKEN || API_CONFIG.token}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      return safeSendMessage(chatId, "❌ Error verifying username. Please try again later.");
    }
    const apiData = await response.json();
    const transformedData = transformLeaderboardData(apiData);
    const userExists = transformedData.data.monthly.data.some(
      (p: any) => p.name.toLowerCase() === username.toLowerCase()
    );
    if (!userExists) {
      return safeSendMessage(chatId, "❌ Username not found. Please check the username and try again.");
    }
    // Find or create user in our database
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    if (!user) {
      const [insertedUser] = await db
        .insert(users)
        .values({
          username: username,
          email: `${username}@placeholder.com`,
          password: "placeholder",
          isAdmin: false,
        })
        .returning();
      user = insertedUser;
    }
    // Create verification request
    const [request] = await db.insert(verificationRequests).values({
      telegramId: chatId.toString(),
      userId: user.id,
      status: "pending",
      telegramUsername: msg.from?.username || null,
    }).returning();
    await safeSendMessage(chatId, "✅ Verification request submitted. An admin will review it shortly.");
    const adminMessage = `🔍 New Verification Request #${request.id}
👤 Telegram: @${msg.from?.username || "N/A"}
🎮 Goated: ${username}
💬 Chat ID: ${chatId}`;
    const inlineKeyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Approve", callback_data: `approve_${request.id}` },
            { text: "❌ Reject", callback_data: `reject_${request.id}` },
          ],
        ],
      },
    };
    await safeSendMessage(BOT_ADMIN_ID, adminMessage, inlineKeyboard, "high");
  } catch (error) {
    console.error("Verification error:", error);
    await safeSendMessage(chatId, "❌ Error processing verification. Please try again later.");
  }
};

const handleStatsCommand = async (msg: TelegramBot.Message, args: string[]) => {
  const chatId = msg.chat.id;
  debugLog("📝 Stats command received from:", chatId);
  try {
    const targetUsername = args[0]?.trim();
    const isAdminUser = await isUserGroupAdmin(chatId, msg.from!.id);
    if (targetUsername && !isAdminUser) {
      return safeSendMessage(chatId, "❌ You can only check your own stats. Use /stats without parameters.", {}, "medium", true);
    }
    if (!targetUsername) {
      const [telegramUser] = await db
        .select()
        .from(telegramUsers)
        .where(eq(telegramUsers.telegramId, chatId.toString()))
        .limit(1);
      if (!telegramUser?.isVerified) {
        return safeSendMessage(chatId, "❌ Please verify your account first using /verify <your_username>");
      }
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, telegramUser.userId))
        .limit(1);
      return await fetchAndSendStats(chatId, user.username);
    } else {
      if (!isAdminUser) {
        return safeSendMessage(chatId, "❌ You don't have permission to check other users' stats.");
      }
      return await fetchAndSendStats(chatId, targetUsername);
    }
  } catch (error) {
    console.error("Stats error:", error);
    await safeSendMessage(chatId, "❌ Error fetching stats. Please try again later.");
  }
};

const handleLeaderboardCommand = async (msg: TelegramBot.Message) => {
  const chatId = msg.chat.id;
  debugLog("📝 Leaderboard command received from:", chatId);
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}`, {
      headers: {
        Authorization: `Bearer ${process.env.API_TOKEN || API_CONFIG.token}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch leaderboard: ${response.status}`);
    }
    const rawData = await response.json();
    const transformedData = transformLeaderboardData(rawData);
    if (!transformedData.data.monthly.data.length) {
      return safeSendMessage(chatId, "❌ No leaderboard data available.");
    }
    const PRIZE_POOL = 500;
    const verifiedUsersQuery = await db
      .select({
        username: users.username,
        telegramUsername: telegramUsers.telegramUsername,
      })
      .from(users)
      .innerJoin(telegramUsers, eq(users.id, telegramUsers.userId))
      .where(eq(telegramUsers.isVerified, true));
    const verifiedUsers = new Map(
      verifiedUsersQuery.map((user) => [user.username.toLowerCase(), user.telegramUsername])
    );
    const formatLeaderboardEntry = (player: any, position: number): string => {
      const telegramTag = verifiedUsers.get(player.name.toLowerCase());
      const displayName = telegramTag ? `@${telegramTag}` : player.name;
      const wagered = formatCurrency(player.wagered.this_month);
      return `${position.toString().padStart(2, " ")}. ${displayName}\n    💰 $${wagered.padStart(12, " ")}`;
    };
    const top10 = transformedData.data.monthly.data.slice(0, 10)
      .map((player: any, index: number) => formatLeaderboardEntry(player, index + 1))
      .join("\n\n");
    const message = `🏆 Monthly Race Leaderboard
💵 Prize Pool: $${PRIZE_POOL}
🏁 Current Top 10:\n\n${top10}\n\n📊 Updated: ${new Date().toLocaleString()}`;
    const inlineKeyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📊 My Stats", callback_data: "my_stats" },
            { text: "🔄 Refresh", callback_data: "refresh_leaderboard" },
          ],
        ],
      },
    };
    await safeSendMessage(chatId, message, inlineKeyboard);
  } catch (error) {
    console.error("Leaderboard error:", error);
    await safeSendMessage(chatId, "❌ Error fetching leaderboard. Please try again later.");
  }
};

const formatCurrency = (amount: number): string => {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
};

async function fetchAndSendStats(chatId: number, username: string) {
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.stats}/${username}`, {
      headers: {
        Authorization: `Bearer ${process.env.API_TOKEN || API_CONFIG.token}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.status}`);
    }
    const data = await response.json();
    const message = formatStatsMessage(data, username);
    const inlineKeyboard = {
      reply_markup: {
        inline_keyboard: [[{ text: "🔄 Refresh Stats", callback_data: `stats_${username}` }]],
      },
    };
    await safeSendMessage(chatId, message, inlineKeyboard);
  } catch (error) {
    console.error("Error fetching stats:", error);
    await safeSendMessage(chatId, "❌ Error fetching stats. Please try again later.");
  }
}

function formatStatsMessage(data: any, username: string): string {
  return `📊 Stats for ${username}:

💰 Daily Stats:
   Wagered Today: $${formatCurrency(data.daily.wagered)}

📅 Weekly Stats:
   Wagered This Week: $${formatCurrency(data.weekly.wagered)}

📆 Monthly Stats:
   Wagered This Month: $${formatCurrency(data.monthly.wagered)}
   Monthly Race Position: #${data.monthly.position}

🏆 All-Time Stats:
   Total Wagered: $${formatCurrency(data.allTime.wagered)}`;
}

//#endregion

//#region Safe Message Sender

const safeSendMessage = async (
  chatId: number,
  text: string,
  options: TelegramBot.SendMessageOptions = {},
  priority: Priority = "medium",
  autoDelete: boolean = false
): Promise<void> => {
  if (!botInstance) return;
  const sendTask = async (): Promise<void> => {
    try {
      const msg = await botInstance.sendMessage(chatId, text, {
        ...options,
        disable_web_page_preview: true,
        parse_mode: "HTML",
      });
      if (autoDelete && GROUP_MESSAGE_TYPES.includes(msg.chat.type)) {
        setTimeout(async () => {
          try {
            await botInstance!.deleteMessage(chatId, msg.message_id.toString());
          } catch (error) {
            debugLog("Error deleting message:", error);
          }
        }, 5 * 60 * 1000);
      }
    } catch (error: any) {
      if (error.code === 403) {
        debugLog(`Bot blocked by user ${chatId}`);
        return;
      }
      try {
        await botInstance.sendMessage(chatId, text.replace(/[<>]/g, ""), {
          ...options,
          parse_mode: undefined,
          disable_web_page_preview: true,
        });
      } catch (retryError: any) {
        debugLog(`Failed to send message to ${chatId}:`, retryError);
      }
    }
  };
  await messageQueue.add(chatId, sendTask, priority);
};

//#endregion

//#region Update Handler & Exports

export function handleUpdate(update: TelegramBot.Update) {
  if (!botInstance) return;
  if (update.message) {
    botInstance.emit("message", update.message);
  } else if (update.callback_query) {
    botInstance.emit("callback_query", update.callback_query);
  }
}

export {
  botInstance as bot,
  initializeBot,
  handleVerifyCommand,
  handleStatsCommand,
  handleLeaderboardCommand,
  handleVerificationAction,
};

startHealthCheck(); // Start monitoring after bot initialization