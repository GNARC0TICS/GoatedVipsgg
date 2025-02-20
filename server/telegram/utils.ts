import TelegramBot from 'node-telegram-bot-api';

// A set to cache the IDs of group chats where the bot is an admin
export const adminGroupChats = new Set<number>();

// A utility function to safely send a message using the bot
export async function safeSendMessage(
  bot: TelegramBot,
  chatId: number,
  text: string,
  options: TelegramBot.SendMessageOptions = {}
): Promise<TelegramBot.Message | void> {
  try {
    const sent = await bot.sendMessage(chatId, text, options);
    return sent;
  } catch (error) {
    console.error("Error sending message:", error);
  }
}

// A dummy check for admin privileges
// In a real implementation this should query a database or use proper logic
export async function checkIsAdmin(telegramId: string): Promise<boolean> {
  // For now we'll assume all users are not admin except a hardcoded id, or simply return true for testing
  // Replace this with proper logic as needed
  return true;
}

// Update the cached group chats from incoming messages
export function updateAdminGroupChats(msg: TelegramBot.Message): void {
  if (msg.chat && (msg.chat.type === 'group' || msg.chat.type === 'supergroup')) {
    adminGroupChats.add(msg.chat.id);
  }
} 