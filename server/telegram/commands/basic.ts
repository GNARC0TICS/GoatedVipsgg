
import TelegramBot from 'node-telegram-bot-api';
import { Command } from './index';

export const startCommand: Command = {
  name: 'start',
  description: 'Get started with the bot',
  enabled: true,
  showInHelp: true,
  handler: async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, '👋 Welcome to GoatedVIPs Bot! Use /help to see available commands.');
  }
};

export const statsCommand: Command = {
  name: 'stats',
  description: 'View your wager statistics',
  enabled: true,
  showInHelp: true,
  handler: async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, '📊 Your wager statistics will appear here.');
  }
};

export const playCommand: Command = {
  name: 'play',
  description: 'Get Goated affiliate link',
  enabled: true,
  showInHelp: true,
  handler: async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, '🎮 Play on Goated: https://goated.com');
  }
};
