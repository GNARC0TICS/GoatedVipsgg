const TelegramBot = require('node-telegram-bot-api');
const token = 'YOUR_TELEGRAM_BOT_TOKEN'; // Replace with your bot token

// Singleton check for Telegram bot
let bot;
if (!global.telegramBot) {
  bot = new TelegramBot(token, { polling: true });
  global.telegramBot = bot;
  console.log('Telegram bot initialized');
} else {
  bot = global.telegramBot;
  console.log('Using existing Telegram bot instance');
}

//Example usage:
bot.onText(/\/echo (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const resp = match[1];
  bot.sendMessage(chatId, resp);
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  console.log(msg); //log message
});