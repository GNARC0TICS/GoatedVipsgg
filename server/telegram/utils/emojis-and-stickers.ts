
// Custom emoji configuration with Telegram custom emoji IDs
export const CUSTOM_EMOJIS = {
  // Branding
  logo: '⭐️', // Fallback: [5956308779791291440]
  
  // Race & Competition
  race: '🏃', // Fallback: [5222141780476046109]
  raceFlag: '🏁', // Fallback: [5411520005386806155]
  trophy: '🏆', // Fallback: [5280769763398671636]
  
  // Rankings
  first: '🥇', // Fallback: [5440539497383087970]
  second: '🥈', // Fallback: [5447203607294265305]
  third: '🥉', // Fallback: [5453902265922376865]
  
  // Bonus & Rewards
  bonus: '🎁', // Fallback: [6032605098528477151]
  bonusAlt: '🎉', // Fallback: [6046260843966893372]
  cash: '💰', // Fallback: [5215706742645599766]
  moneyBag: '💵', // Fallback: [5213094908608392768]
  
  // Verification & Status
  reject: '❌', // Fallback: [6113872536968104754]
  approve: '✅', // Fallback: [6318741991656001135]
  verified: '✨', // Fallback: [5366450216310416145]
  goldVerified: '💫', // Fallback: [6086832243211242109]
  banned: '🚫', // Fallback: [5213224006735376143]
  
  // Navigation & UI
  website: '🌐', // Fallback: [5447410659077661506]
  help: '❓', // Fallback: [5019413195186504264]
  attention: '⚠️', // Fallback: [5213181173026533794]
  refresh: '🔄', // Fallback: [6012661228910939253]
  stats: '📊', // Fallback: [5231200819986047254]
  clock: '⏰', // Fallback: [5285409457654737374]
  bell: '🔔', // Fallback: [5267061559229687802]
  play: '▶️', // Fallback: [5215229232476596064]
  
  // VIP & Special
  vip: '👑', // Fallback: [5996899742611672774]
  vipCert: '📜', // Fallback: [5431684550424011313]
  admin: '🎩', // Fallback: [5339564150534200424]
  live: '🔴', // Fallback: [4927197721900614739]
  
  // Decorative
  goldBullet: '•', // Fallback: [5249224203567112577]
  silverBullet: '•', // Fallback: [5249028709540701810]
  sparkle: '✨', // Fallback: [5267389686141166350]
  confetti: '🎊', // Fallback: [5201730588351945766]
  loading: '⌛️', // Fallback: [5350752364246606166]
};

// Helper function to get Telegram custom emoji string
export function getTelegramCustomEmoji(emojiId: string): string {
  return `<tg-emoji emoji-id="${emojiId}"/>`;
}

// Create a visual progress bar
export function createProgressBar(current: number, max: number, length: number = 10): string {
  const filled = Math.floor((current / max) * length);
  const empty = length - filled;
  return '▓'.repeat(filled) + '░'.repeat(empty);
}

// Format large numbers
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2
  }).format(num);
}

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
