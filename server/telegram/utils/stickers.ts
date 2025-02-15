
// Define custom sticker file IDs
export const CUSTOM_STICKERS = {
  welcome: 'CAACAgUAAxkBAAEB..._ID',  // Replace with actual sticker ID
  bonus: 'CAACAgUAAxkBAAEB..._ID',    // Replace with actual sticker ID
  error: 'CAACAgUAAxkBAAEB..._ID',    // Replace with actual sticker ID
  success: 'CAACAgUAAxkBAAEB..._ID',  // Replace with actual sticker ID
  vip: 'CAACAgUAAxkBAAEB..._ID'       // Replace with actual sticker ID
};

// Function to send sticker with message
export async function sendStickerWithMessage(bot: any, chatId: number, stickerId: string, message: string, options = {}) {
  try {
    await bot.sendSticker(chatId, stickerId);
    await bot.sendMessage(chatId, message, options);
  } catch (error) {
    console.error('Error sending sticker:', error);
    // Fallback to just sending message if sticker fails
    await bot.sendMessage(chatId, message, options);
  }
}
