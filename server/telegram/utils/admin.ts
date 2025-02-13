import { db } from "@db";
import { telegramUsers } from "@db/schema";
import { eq } from "drizzle-orm";

export async function isUserGroupAdmin(chatId: number, userId: number): Promise<boolean> {
  try {
    const chat = await botInstance?.getChat(chatId);
    if (!chat) return false;

    const admins = await botInstance?.getChatAdministrators(chatId);
    return admins?.some(admin => admin.user.id === userId) || false;
  } catch (error) {
    console.error(`Error checking admin status: ${error}`);
    return false;
  }
}
