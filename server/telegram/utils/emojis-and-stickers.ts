
// Custom emoji configuration
export const CUSTOM_EMOJIS = {
  welcome: '👋',  // Welcome wave
  bonus: '🎁',    // Gift/bonus
  error: '❌',     // Error X
  success: '✅',   // Success checkmark
  vip: '👑'       // VIP crown/royalty
};

// Future custom sticker configuration (commented out for now)
export const CUSTOM_STICKERS = {
  // welcome: 'CAACAgEAAxkBAAIQ7WXLBrQBnj3Q...',  // Future welcome sticker
  // bonus: 'CAACAgEAAxkBAAIQ7mXLBsIBnk4Q...',    // Future bonus sticker
  // error: 'CAACAgEAAxkBAAIQ72XLBtcBnl5Q...',    // Future error sticker
  // success: 'CAACAgEAAxkBAAIQ8GXLBukBnm6Q...',  // Future success sticker
  // vip: 'CAACAgEAAxkBAAIQ8WXLBv0Bnn7Q...'      // Future VIP sticker
};

// Send message with emoji
export async function sendMessageWithEmoji(bot: any, chatId: number, emoji: string, message: string, options = {}) {
  try {
    await bot.sendMessage(chatId, `${emoji} ${message}`, options);
  } catch (error) {
    console.error('Error sending message:', error);
    // Fallback to just sending message if emoji fails
    await bot.sendMessage(chatId, message, options);
  }
}

// Future sticker function (commented out for now)
/*
export async function sendStickerWithMessage(bot: any, chatId: number, stickerId: string, message: string, options = {}) {
  try {
    await bot.sendSticker(chatId, stickerId);
    await bot.sendMessage(chatId, message, options);
  } catch (error) {
    console.error('Error sending sticker:', error);
    await bot.sendMessage(chatId, message, options);
  }
}
*/
