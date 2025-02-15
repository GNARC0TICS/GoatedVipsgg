import { z } from "zod";
import TelegramBot from "node-telegram-bot-api";
import { db } from "@db";
import { telegramUsers, verificationRequests } from "@db/schema/telegram";
import { users } from "@db/schema/users";
import { eq } from "drizzle-orm";
import { log } from "./utils/logger";

let botInstance: TelegramBot | null = null;
let healthCheckInterval: NodeJS.Timeout | null = null;

export async function initializeBot(): Promise<TelegramBot | null> {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    log("❌ TELEGRAM_BOT_TOKEN is not set!");
    return null;
  }

  try {
    log("Starting Telegram bot initialization...");
    botInstance = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
      polling: true,
      filepath: false // Disable file downloads
    });

    log("Bot instance created, setting up event handlers...");

    // Handle errors
    botInstance.on('error', (error) => {
      log(`❌ Bot error: ${error.message}`);
    });

    botInstance.on('polling_error', (error) => {
      log(`❌ Polling error: ${error.message}`);
    });

    // Handle callback queries (button clicks)
    botInstance.on('callback_query', async (query) => {
      if (!query.message) {
        log("Received callback query without message");
        return;
      }

      log(`Received callback query: ${query.data} from ${query.from.username}`);
      const [action, telegramUsername] = query.data?.split(':') || [];
      const adminId = query.from.id.toString();

      try {
        const admin = await db
          .select()
          .from(users)
          .where(eq(users.telegramId, adminId))
          .limit(1);

        if (!admin[0]?.isAdmin) {
          log(`Non-admin ${query.from.username} attempted to use admin action`);
          return botInstance?.answerCallbackQuery(query.id, {
            text: "❌ Only admins can perform this action",
            show_alert: true
          });
        }

        const request = await db
          .select()
          .from(verificationRequests)
          .where(eq(verificationRequests.telegramUsername, telegramUsername))
          .limit(1);

        if (!request[0]) {
          log(`Request not found for username: ${telegramUsername}`);
          return botInstance?.answerCallbackQuery(query.id, {
            text: "❌ Request not found",
            show_alert: true
          });
        }

        if (action === 'approve') {
          await handleApproval(request[0], adminId, query);
        } else if (action === 'reject') {
          await handleRejection(request[0], adminId, query);
        }
      } catch (error) {
        log(`Error handling button click: ${error}`);
        await botInstance?.answerCallbackQuery(query.id, {
          text: "❌ Error processing request",
          show_alert: true
        });
      }
    });

    // Handle commands
    botInstance.on("message", async (msg) => {
      if (!msg.text) return;

      log(`Received message: ${msg.text} from ${msg.from?.username}`);
      const [command, username] = msg.text.split(" ");

      try {
        if (command === '/verify') {
          await handleVerify(msg, username);
        } else if (command === '/pending' && msg.from) {
          await handlePending(msg);
        } else if (command === '/help') {
          await handleHelp(msg);
        } else {
          log(`Unknown command received: ${command}`);
          await safeSendMessage(msg.chat.id, "Unknown command. Use /help to see available commands.");
        }
      } catch (error) {
        log(`Error handling command ${command}: ${error}`);
        await safeSendMessage(msg.chat.id, "❌ An error occurred. Please try again later.");
      }
    });

    const botInfo = await botInstance.getMe();
    log(`✅ Bot initialized successfully as @${botInfo.username}`);
    startHealthCheck();
    return botInstance;
  } catch (error) {
    log(`❌ Bot initialization failed: ${error}`);
    return null;
  }
}

async function handleVerify(msg: TelegramBot.Message, goatedUsername?: string) {
  if (!botInstance || !msg.from?.username) {
    return safeSendMessage(msg.chat.id, "❌ Please set a Telegram username first.");
  }

  if (!goatedUsername) {
    return safeSendMessage(msg.chat.id, 
      "📝 To verify your account, use:\n" +
      "/verify YourGoatedUsername\n\n" +
      "Example: /verify JohnDoe123"
    );
  }

  try {
    // Check if already verified
    const existing = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramId, msg.from.id.toString()))
      .limit(1);

    if (existing[0]) {
      return safeSendMessage(msg.chat.id, "✅ Your account is already verified!");
    }

    // Create verification request
    await db.insert(verificationRequests).values({
      telegramId: msg.from.id.toString(),
      telegramUsername: msg.from.username,
      userId: goatedUsername,
      status: "pending"
    });

    await safeSendMessage(msg.chat.id, 
      "✅ Verification request submitted!\n" +
      "An admin will verify your account soon."
    );

    // Notify admins
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
    log(`Verification error: ${error}`);
    await safeSendMessage(msg.chat.id, "❌ Error submitting request. Please try again later.");
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

    for (const request of pending) {
      const buttons = {
        inline_keyboard: [[
          { text: "✅ Approve", callback_data: `approve:${request.telegramUsername}` },
          { text: "❌ Reject", callback_data: `reject:${request.telegramUsername}` }
        ]]
      };

      await botInstance.sendMessage(
        msg.chat.id,
        `👤 Verification Request:\n` +
        `Telegram: @${request.telegramUsername}\n` +
        `Goated: ${request.userId}`,
        { reply_markup: buttons }
      );
    }
  } catch (error) {
    log(`Error listing pending requests: ${error}`);
    await safeSendMessage(msg.chat.id, "❌ Error fetching pending requests.");
  }
}

async function handleApproval(request: any, adminId: string, query: TelegramBot.CallbackQuery) {
  if (!botInstance) return;

  try {
    // Update request status
    await db
      .update(verificationRequests)
      .set({
        status: 'approved',
        verifiedAt: new Date(),
        verifiedBy: adminId
      })
      .where(eq(verificationRequests.telegramUsername, request.telegramUsername));

    // Create verified user entry
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
    log(`Error approving user: ${error}`);
    await botInstance.answerCallbackQuery(query.id, {
      text: "Error approving user",
      show_alert: true
    });
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
    log(`Error rejecting user: ${error}`);
    await botInstance.answerCallbackQuery(query.id, {
      text: "Error rejecting user",
      show_alert: true
    });
  }
}

async function handleHelp(msg: TelegramBot.Message) {
  const helpText = `
🤖 Available Commands:

/verify YourGoatedUsername
Link your Goated.com account

/help
Show this help message

For admins:
/pending
View pending verification requests
`.trim();

  await safeSendMessage(msg.chat.id, helpText);
}

async function safeSendMessage(chatId: number, text: string, options: any = {}) {
  if (!botInstance) return;

  try {
    await botInstance.sendMessage(chatId, text, options);
  } catch (error) {
    log(`Failed to send message to ${chatId}: ${error}`);
  }
}

function startHealthCheck() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }

  healthCheckInterval = setInterval(async () => {
    if (!botInstance) return;

    try {
      await botInstance.getMe();
      log("✅ Bot health check passed");
    } catch (error) {
      log(`❌ Bot health check failed: ${error}`);
      await initializeBot();
    }
  }, 60000);
}

export {
  botInstance as bot,
  safeSendMessage,
};