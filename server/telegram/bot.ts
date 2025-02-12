import TelegramBot from "node-telegram-bot-api";
import { db } from "@db";
import { telegramUsers, verificationRequests } from "@db/schema/telegram";
import { API_CONFIG } from "../config/api";
import { eq } from "drizzle-orm";

// 🌐 Type Definitions for API Response
interface WagerStats {
  today: number;
  this_week: number;
  this_month: number;
  all_time: number;
}

interface UserData {
  uid: string;
  name: string;
  wagered: WagerStats;
}

interface LeaderboardResponse {
  status: string;
  metadata: { totalUsers: number; lastUpdated: string };
  data: {
    today: { data: UserData[] };
    weekly: { data: UserData[] };
    monthly: { data: UserData[] };
    all_time: { data: UserData[] };
  };
}

// 🛡️ Rate Limiting Setup
const messageRateLimiter = new Map<number, number>();
const RATE_LIMIT_WINDOW = 1000; // 1 second

const safeSendMessage = async (chatId: number, text: string, options = {}) => {
  try {
    const now = Date.now();
    const lastMessageTime = messageRateLimiter.get(chatId) || 0;

    if (now - lastMessageTime < RATE_LIMIT_WINDOW) {
      console.warn(`Rate limit applied for chat: ${chatId}`);
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_WINDOW));
    }

    messageRateLimiter.set(chatId, now);
    return await bot.sendMessage(chatId, text, { ...options, disable_web_page_preview: true });
  } catch (error: any) {
    console.error(`Error sending message: ${error.message}`);
    try {
      return await bot.sendMessage(chatId, text.replace(/[<>]/g, "").trim(), {
        ...options,
        parse_mode: undefined,
        disable_web_page_preview: true,
      });
    } catch (secondError: any) {
      console.error(`Failed to send even a simplified message: ${secondError.message}`);
    }
  }
};

// 🔐 Ensure Environment Variables Exist
if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error("❌ TELEGRAM_BOT_TOKEN is required!");

let bot: TelegramBot;
try {
  console.log("🔹 Initializing Telegram bot...");
  bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
    polling: { interval: 300, autoStart: true, params: { timeout: 10 } },
    filepath: false,
  });
  
  // Verify bot connection
  bot.getMe().then((botInfo) => {
    console.log(`✅ Bot connected successfully as @${botInfo.username}`);
  }).catch((error) => {
    console.error("❌ Failed to connect bot:", error.message);
  });

  bot.on("polling_error", (error) => console.error("⚠️ Polling Error:", error.message));
  bot.on("error", (error) => console.error("⚠️ Telegram Bot Error:", error.message));
} catch (error) {
  console.error("🚨 Failed to create bot instance:", error);
  throw error;
}

// 🛡️ Admin Check
const isAdmin = async (chatId: number) => chatId.toString() === "1689953605";

// 🌟 Command Handlers
bot.onText(/\/start/, async (msg) => {
  await safeSendMessage(msg.chat.id, "🎮 Welcome to GoatedVIPs Affiliate Bot!\nUse /verify to link your account.");
});

bot.onText(/\/play/, async (msg) => {
  await safeSendMessage(msg.chat.id, "🎮 Play on Goated: https://goatedvips.gg/?ref=telegram");
});

bot.onText(/\/website/, async (msg) => {
  await safeSendMessage(msg.chat.id, "🌐 Visit: https://goatedvips.gg");
});

// 🏆 Leaderboard Command
bot.onText(/\/leaderboard/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}`, {
      headers: { Authorization: `Bearer ${process.env.API_TOKEN || API_CONFIG.token}` },
    });

    if (!response.ok) throw new Error("Failed to fetch leaderboard");

    const data = (await response.json()) as LeaderboardResponse;
    const top10 = data.data.monthly.data.slice(0, 10);

    if (!top10.length) return safeSendMessage(chatId, "❌ No leaderboard data available.");

    const leaderboardMessage = top10
      .map((player, i) => `#${i + 1} ${player.name} - 💰 $${player.wagered.this_month.toFixed(2)}`)
      .join("\n");
    await safeSendMessage(chatId, `🏆 Monthly Leaderboard:\n\n${leaderboardMessage}`);
  } catch (error) {
    console.error("Leaderboard error:", error);
    await safeSendMessage(chatId, "❌ Error fetching leaderboard. Try again later.");
  }
});

// 🔐 Verification Command
bot.onText(/\/verify (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const username = match?.[1]?.trim();
  if (!username) return safeSendMessage(chatId, "Usage: /verify your_platform_username");

  try {
    const existingUser = await db.select().from(telegramUsers).where(eq(telegramUsers.telegramId, chatId.toString())).limit(1);
    if (existingUser.length > 0 && existingUser[0].isVerified) return safeSendMessage(chatId, "✅ Already verified!");

    await db.insert(verificationRequests).values({
      telegramId: chatId.toString(),
      goatedUsername: username,
      status: "pending",
      telegramUsername: msg.from?.username || null,
    });

    await safeSendMessage(chatId, "✅ Verification request submitted. An admin will review it shortly.");
    await safeSendMessage(1689953605, `🔔 Verification Request:\nUser: ${username}\nTelegram: @${msg.from?.username}`);
  } catch (error) {
    console.error("Verification error:", error);
    await safeSendMessage(chatId, "❌ Error processing verification. Try again later.");
  }
});

// 📊 Stats Command
bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const [user] = await db.select().from(telegramUsers).where(eq(telegramUsers.telegramId, chatId.toString())).limit(1);
    if (!user?.isVerified) return safeSendMessage(chatId, "❌ Please verify your account using /verify");

    const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}`, {
      headers: { Authorization: `Bearer ${process.env.API_TOKEN || API_CONFIG.token}` },
    });

    if (!response.ok) throw new Error("Failed to fetch stats");

    const data = (await response.json()) as LeaderboardResponse;
    const userStats = data.data.monthly.data.find((p) => p.name.toLowerCase() === user.goatedUsername?.toLowerCase());

    if (!userStats) return safeSendMessage(chatId, "❌ No stats found for your account this period.");

    const position = data.data.monthly.data.findIndex((p) => p.name.toLowerCase() === user.goatedUsername?.toLowerCase()) + 1;
    await safeSendMessage(chatId, `📊 Stats for ${user.goatedUsername}:\n💰 Wagered: $${userStats.wagered.this_month.toFixed(2)}\n📍 Position: #${position}`);
  } catch (error) {
    console.error("Stats error:", error);
    await safeSendMessage(chatId, "❌ Error fetching stats. Try again later.");
  }
});

export { bot };