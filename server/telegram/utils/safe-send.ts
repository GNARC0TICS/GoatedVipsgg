import TelegramBot from "node-telegram-bot-api";

export async function safeSendMessage(
  chatId: number,
  text: string,
  bot: TelegramBot,
  options: TelegramBot.SendMessageOptions = {}
): Promise<void> {
  try {
    await bot.sendMessage(chatId, text, options);
  } catch (error) {
    console.error(`Failed to send message to ${chatId}:`, error);
  }
}
