/**
 * Leaderboard command for Telegram bot
 * Displays top players and their wager statistics
 */

import TelegramBot from 'node-telegram-bot-api';
import { CommandDefinition, CommandAccessLevel } from './index';
import { logger, apiClient, MessageTemplates, BotConfig } from '../utils';
import { db } from '@db';

/**
 * Format number with commas and appropriate decimal places
 * @param num Number to format
 * @param decimals Number of decimal places
 * @returns Formatted number string
 */
function formatNumber(num: number, decimals = 2): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Leaderboard command handler
 */
const leaderboardCommand: CommandDefinition = {
  name: 'leaderboard',
  description: 'See top players',
  accessLevel: CommandAccessLevel.PUBLIC,
  enabled: true,
  showInHelp: true,
  handler: async (bot: TelegramBot, msg: TelegramBot.Message, match: RegExpExecArray | null): Promise<void> => {
    const chatId = msg.chat.id;
    
    try {
      // Get leaderboard data from API
      const url = new URL(`${BotConfig.API.RACES}/leaderboard`);
      url.searchParams.append('limit', '10');
      
      const response = await apiClient.request<any>(url.toString());
      
      if (!response || !response.leaderboard) {
        await bot.sendMessage(chatId, MessageTemplates.ERRORS.NOT_FOUND);
        return;
      }
      
      const leaderboard = response.leaderboard;
      
      if (leaderboard.length === 0) {
        await bot.sendMessage(chatId, 'No leaderboard data available for the current period.');
        return;
      }
      
      // Format leaderboard message
      let message = `🏆 *Top Wagers Leaderboard* 🏆\n\n`;
      
      leaderboard.forEach((entry: any, index: number) => {
        // Use medals for top 3
        const position = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}\\)`;
        const username = entry.username || 'Anonymous';
        const wagered = formatNumber(entry.wagered || 0);
        
        message += `${position} *${username}* \\- $${wagered}\n`;
      });
      
      message += `\n💰 Join our wager race to earn rewards\\! Use /race to check your position\\.`;
      message += `\n🎮 Play at Goated\\.com to increase your rank\\!`;
      
      await bot.sendMessage(chatId, message, { parse_mode: 'MarkdownV2' });
      
      logger.info('Leaderboard command executed', {
        userId: msg.from?.id,
        username: msg.from?.username,
        entries: leaderboard.length
      });
    } catch (error) {
      logger.error('Error fetching leaderboard data', {
        error: error instanceof Error ? error.message : String(error),
        userId: msg.from?.id
      });
      
      await bot.sendMessage(
        chatId,
        'Unable to fetch leaderboard data at this time. Please try again later.'
      );
    }
  }
};

/**
 * Race command handler - shows user's position in current race
 */
const raceCommand: CommandDefinition = {
  name: 'race',
  description: 'Check your race position',
  accessLevel: CommandAccessLevel.PUBLIC,
  pattern: /^\/race(?:\s+(.+))?$/,
  enabled: true,
  showInHelp: true,
  handler: async (bot: TelegramBot, msg: TelegramBot.Message, match: RegExpExecArray | null): Promise<void> => {
    const chatId = msg.chat.id;
    
    try {
      // If username is provided as argument, check that position
      const username = match && match[1] ? match[1].trim() : null;
      
      // Get race data from API
      const response = await apiClient.request<any>(BotConfig.API.RACES);
      
      if (!response) {
        await bot.sendMessage(chatId, MessageTemplates.ERRORS.NOT_FOUND);
        return;
      }
      
      const raceData = response as any;
      let userPosition = null;
      
      if (username) {
        // Find specific user in leaderboard
        if (raceData.leaderboard) {
          userPosition = raceData.leaderboard.findIndex((entry: any) => 
            entry.username && entry.username.toLowerCase() === username.toLowerCase()
          );
        }
      }
      
      // Format race message
      let message = `🏁 *Current Wager Race* 🏁\n\n`;
      
      // Add race details
      message += `Race ID: *${raceData.id || 'Unknown'}*\n`;
      message += `Status: *${raceData.status || 'Unknown'}*\n`;
      
      if (raceData.startDate) {
        message += `Start: *${new Date(raceData.startDate).toLocaleDateString()}*\n`;
      }
      
      if (raceData.endDate) {
        message += `End: *${new Date(raceData.endDate).toLocaleDateString()}*\n`;
      }
      
      message += `\n`;
      
      // Add user position if found
      if (username && userPosition !== null && userPosition >= 0) {
        const position = userPosition + 1;
        const entry = raceData.leaderboard[userPosition];
        message += `📊 *${username}* is currently in position *${position}*\n`;
        message += `💰 Total Wagered: *$${formatNumber(entry.wagered || 0)}*\n\n`;
      } else if (username) {
        message += `📊 *${username}* is not currently on the leaderboard\\.\n\n`;
      }
      
      // Add top 5 positions
      message += `*Top 5 Positions:*\n`;
      
      if (raceData.leaderboard && raceData.leaderboard.length > 0) {
        const top5 = raceData.leaderboard.slice(0, 5);
        
        top5.forEach((entry: any, index: number) => {
          const position = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}\\)`;
          const username = entry.username || 'Anonymous';
          const wagered = formatNumber(entry.wagered || 0);
          
          message += `${position} *${username}* \\- $${wagered}\n`;
        });
      } else {
        message += `No participants yet\\!`;
      }
      
      message += `\n🎮 Play at Goated\\.com to join the race\\!`;
      
      await bot.sendMessage(chatId, message, { parse_mode: 'MarkdownV2' });
      
      logger.info('Race command executed', {
        userId: msg.from?.id,
        username: msg.from?.username,
        queriedUsername: username
      });
    } catch (error) {
      logger.error('Error fetching race data', {
        error: error instanceof Error ? error.message : String(error),
        userId: msg.from?.id
      });
      
      await bot.sendMessage(
        chatId,
        'Unable to fetch race data at this time. Please try again later.'
      );
    }
  }
};

export { leaderboardCommand, raceCommand };
export default leaderboardCommand;