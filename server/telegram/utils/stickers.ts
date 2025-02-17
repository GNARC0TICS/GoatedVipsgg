
// Define custom sticker file IDs
export const CUSTOM_STICKERS = {
  welcome: 'CAACAgEAAxkBAAIQ7WXLBrQBnj3Q_YOUR_STICKER_ID_HERE',  // Replace with your Goated welcome sticker
  bonus: 'CAACAgEAAxkBAAIQ7mXLBsIBnk4Q_YOUR_STICKER_ID_HERE',    // Replace with bonus sticker
  error: 'CAACAgEAAxkBAAIQ72XLBtcBnl5Q_YOUR_STICKER_ID_HERE',    // Replace with error sticker
  success: 'CAACAgEAAxkBAAIQ8GXLBukBnm6Q_YOUR_STICKER_ID_HERE',  // Replace with success sticker
  vip: 'CAACAgEAAxkBAAIQ8WXLBv0Bnn7Q_YOUR_STICKER_ID_HERE'      // Replace with VIP sticker
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
