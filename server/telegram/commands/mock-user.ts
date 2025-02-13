import { db } from "@db";
import { eq, and } from "drizzle-orm";
import { mockWagerData, users, telegramUsers } from "@db/schema";
import TelegramBot from "node-telegram-bot-api";
import { isUserGroupAdmin } from "../utils/admin";
import { safeSendMessage } from "../utils/safe-send";
import { log } from "../utils/logger";

// List of developer Telegram usernames who can use mock commands
const DEVELOPER_USERNAMES = ["your_telegram_username"]; // Replace with your username

const isDeveloper = async (chatId: number, userId: number): Promise<boolean> => {
  try {
    const user = await db.query.telegramUsers.findFirst({
      where: eq(telegramUsers.telegramId, userId.toString()),
    });
    return DEVELOPER_USERNAMES.includes(user?.username || "");
  } catch (error) {
    log(`Error checking developer status: ${error}`);
    return false;
  }
};

export const handleMockUserCommand = async (
  msg: TelegramBot.Message,
  args: string[],
  bot: TelegramBot
) => {
  const chatId = msg.chat.id;
  const fromId = msg.from!.id;

  if (!(await isDeveloper(chatId, fromId))) {
    return safeSendMessage(chatId, "❌ This command is only available to developers.", bot);
  }

  if (args.length < 2) {
    return safeSendMessage(chatId, "Usage: /mockuser @username amount", bot);
  }

  const username = args[0].replace("@", "").trim();
  const wagerAmount = parseFloat(args[1]);

  if (isNaN(wagerAmount)) {
    return safeSendMessage(chatId, "❌ Invalid wager amount.", bot);
  }

  try {
    // Find or create user
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user) {
      const [newUser] = await db.insert(users)
        .values({
          username: username,
          email: `${username}@mock.com`,
          password: "mock_user",
          isAdmin: false,
        })
        .returning();
      user = newUser;
      log(`Created mock user: ${username}`);
    }

    // Update or insert mock wager data
    const [mockData] = await db
      .insert(mockWagerData)
      .values({
        userId: user.id,
        username: username,
        wageredToday: wagerAmount.toString(),
        wageredThisWeek: wagerAmount.toString(),
        wageredThisMonth: wagerAmount.toString(),
        wageredAllTime: wagerAmount.toString(),
        createdBy: user.id,
        isMocked: true,
      })
      .onConflictDoUpdate({
        target: [mockWagerData.userId],
        set: {
          wageredToday: wagerAmount.toString(),
          wageredThisWeek: wagerAmount.toString(),
          wageredThisMonth: wagerAmount.toString(),
          wageredAllTime: wagerAmount.toString(),
          updatedAt: new Date(),
        },
      })
      .returning();

    safeSendMessage(chatId, `✅ Updated ${username}'s wager to $${wagerAmount.toFixed(2)}`, bot);
  } catch (error) {
    log(`Error updating mock user: ${error}`);
    safeSendMessage(chatId, "❌ Failed to update mock user data.", bot);
  }
};

export const handleClearUserCommand = async (
  msg: TelegramBot.Message,
  args: string[],
  bot: TelegramBot
) => {
  const chatId = msg.chat.id;
  const fromId = msg.from!.id;

  if (!(await isDeveloper(chatId, fromId))) {
    return safeSendMessage(chatId, "❌ This command is only available to developers.", bot);
  }

  if (args.length < 1) {
    return safeSendMessage(chatId, "Usage: /clearuser @username", bot);
  }

  const username = args[0].replace("@", "").trim();

  try {
    const result = await db
      .delete(mockWagerData)
      .where(
        and(
          eq(mockWagerData.username, username),
          eq(mockWagerData.isMocked, true)
        )
      )
      .returning();

    if (result.length > 0) {
      safeSendMessage(chatId, `✅ Cleared mock data for ${username}`, bot);
    } else {
      safeSendMessage(chatId, `❌ No mock data found for ${username}`, bot);
    }
  } catch (error) {
    log(`Error clearing mock user: ${error}`);
    safeSendMessage(chatId, "❌ Failed to clear mock user data.", bot);
  }
};
