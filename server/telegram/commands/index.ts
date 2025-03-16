/**
 * Command registry for Telegram bot commands
 * Implements a registry pattern for better organization and error handling
 */

import TelegramBot from 'node-telegram-bot-api';
import { logger, isAdminMessage, isModeratorMessage, MessageTemplates, LogContext } from '../utils';

// Command handler type definition
export type CommandHandler = (
  bot: TelegramBot,
  msg: TelegramBot.Message,
  match: RegExpExecArray | null
) => Promise<void>;

// Command access level
export enum CommandAccessLevel {
  PUBLIC = 'public',   // Available to all users
  USER = 'user',       // Only for authenticated users
  MOD = 'moderator',   // Only for moderators and admins
  ADMIN = 'admin',     // Only for admins
}

// Command definition interface
export interface CommandDefinition {
  name: string;                // Command name without slash (e.g., 'help')
  handler: CommandHandler;     // Function to handle the command
  pattern?: RegExp;            // Optional custom pattern
  accessLevel: CommandAccessLevel;
  description: string;         // Short description for help menu
  requiresArgs?: boolean;      // Whether the command requires arguments
  enabled: boolean;            // Whether the command is enabled
  showInHelp: boolean;         // Whether to show in help menu
}

// Command registry class to manage all commands
class CommandRegistry {
  private commands: Map<string, CommandDefinition>;
  private commandLog: string[] = [];

  constructor() {
    this.commands = new Map();
    logger.info('Command registry initialized');
  }

  /**
   * Register a command with the registry
   * @param command Command definition
   */
  register(command: CommandDefinition): void {
    if (this.commands.has(command.name)) {
      logger.warn(`Command '${command.name}' already registered, overwriting`);
    }
    
    this.commands.set(command.name, command);
    logger.info(`Registered command: ${command.name}`);
  }

  /**
   * Register multiple commands at once
   * @param commands Array of command definitions
   */
  registerBulk(commands: CommandDefinition[]): void {
    commands.forEach(command => this.register(command));
  }

  /**
   * Get a command by name
   * @param name Command name
   * @returns Command definition or undefined if not found
   */
  getCommand(name: string): CommandDefinition | undefined {
    return this.commands.get(name);
  }

  /**
   * Get all registered commands
   * @returns Map of all commands
   */
  getAllCommands(): Map<string, CommandDefinition> {
    return this.commands;
  }

  /**
   * Get commands visible in the help menu
   * @param accessLevel Minimum access level to include
   * @returns Array of command definitions
   */
  getHelpCommands(accessLevel: CommandAccessLevel = CommandAccessLevel.PUBLIC): CommandDefinition[] {
    const commands: CommandDefinition[] = [];
    
    this.commands.forEach(command => {
      if (command.showInHelp && command.enabled) {
        // Filter by access level
        if (accessLevel === CommandAccessLevel.ADMIN) {
          commands.push(command);
        } else if (accessLevel === CommandAccessLevel.MOD && 
                   command.accessLevel !== CommandAccessLevel.ADMIN) {
          commands.push(command);
        } else if (accessLevel === CommandAccessLevel.USER && 
                   command.accessLevel !== CommandAccessLevel.ADMIN && 
                   command.accessLevel !== CommandAccessLevel.MOD) {
          commands.push(command);
        } else if (accessLevel === CommandAccessLevel.PUBLIC && 
                   command.accessLevel === CommandAccessLevel.PUBLIC) {
          commands.push(command);
        }
      }
    });
    
    return commands;
  }

  /**
   * Check if a user has access to a command
   * @param command Command to check
   * @param msg Telegram message
   * @returns Boolean indicating if the user has access
   */
  hasAccess(command: CommandDefinition, msg: TelegramBot.Message): boolean {
    switch (command.accessLevel) {
      case CommandAccessLevel.PUBLIC:
        return true;
      case CommandAccessLevel.USER:
        // TODO: Check if user is authenticated
        return true;
      case CommandAccessLevel.MOD:
        return isModeratorMessage(msg);
      case CommandAccessLevel.ADMIN:
        return isAdminMessage(msg);
      default:
        return false;
    }
  }

  /**
   * Format the help message based on available commands and user access level
   * @param msg Telegram message
   * @returns Formatted help message
   */
  formatHelpMessage(msg: TelegramBot.Message): string {
    let accessLevel = CommandAccessLevel.PUBLIC;
    
    if (isAdminMessage(msg)) {
      accessLevel = CommandAccessLevel.ADMIN;
    } else if (isModeratorMessage(msg)) {
      accessLevel = CommandAccessLevel.MOD;
    }
    
    const commands = this.getHelpCommands(accessLevel);
    
    let message = `🐐 *Welcome to Goated Stats Bot\\!*\n\n`;
    
    // Admin commands
    if (accessLevel === CommandAccessLevel.ADMIN) {
      message += `*Admin Commands:*\n`;
      commands.filter(cmd => cmd.accessLevel === CommandAccessLevel.ADMIN)
        .forEach(cmd => {
          message += `• /${cmd.name} \\- ${cmd.description}\n`;
        });
      message += `\n`;
    }
    
    // Moderator commands
    if (accessLevel === CommandAccessLevel.ADMIN || accessLevel === CommandAccessLevel.MOD) {
      message += `*Moderator Commands:*\n`;
      commands.filter(cmd => cmd.accessLevel === CommandAccessLevel.MOD)
        .forEach(cmd => {
          message += `• /${cmd.name} \\- ${cmd.description}\n`;
        });
      message += `\n`;
    }
    
    // User commands
    message += `*Available Commands:*\n`;
    commands.filter(cmd => cmd.accessLevel === CommandAccessLevel.PUBLIC || 
                           cmd.accessLevel === CommandAccessLevel.USER)
      .forEach(cmd => {
        message += `• /${cmd.name} \\- ${cmd.description}\n`;
      });
    
    // Support info
    message += `\nNeed help? Contact @xGoombas for support\\.`;
    
    return message;
  }

  /**
   * Register all commands with the bot
   * @param bot Telegram bot instance
   */
  registerWithBot(bot: TelegramBot): void {
    this.commands.forEach((command) => {
      if (!command.enabled) {
        logger.info(`Skipping disabled command: ${command.name}`);
        return;
      }

      const pattern = command.pattern || new RegExp(`^\\/${command.name}(?:\\s+(.+))?$`);

      bot.onText(pattern, async (msg, match) => {
        const logContext = {
          command: command.name,
          chatId: msg.chat.id,
          userId: msg.from?.id,
          username: msg.from?.username,
        };

        // Log command invocation
        logger.info(`Command invoked: ${command.name}`, logContext);
        this.logCommand(command.name, msg);

        try {
          // Check access level
          if (!this.hasAccess(command, msg)) {
            logger.warn(`Access denied for command: ${command.name}`, logContext);
            await bot.sendMessage(msg.chat.id, MessageTemplates.ERRORS.UNAUTHORIZED);
            return;
          }

          // Check if args are required but not provided
          if (command.requiresArgs && (!match || !match[1])) {
            await bot.sendMessage(
              msg.chat.id,
              `❌ The ${command.name} command requires additional parameters. Use /help for more information.`
            );
            return;
          }

          // Execute handler
          await command.handler(bot, msg, match);
        } catch (error) {
          // Log error with proper formatting
          logger.error(`Error executing command: ${command.name}`, { 
            error: error instanceof Error ? error.message : String(error), 
            ...logContext 
          });

          // Send error message to user
          let errorMessage = MessageTemplates.ERRORS.SERVER_ERROR;
          
          if (error instanceof Error) {
            // Add specific error message for admins
            if (isAdminMessage(msg)) {
              errorMessage += `\n\nError: ${error.message}`;
            }
          }

          await bot.sendMessage(msg.chat.id, errorMessage);
        }
      });

      logger.info(`Registered handler for command: ${command.name}`);
    });
  }

  /**
   * Log a command invocation for analytics
   * @param commandName Name of the command
   * @param msg Telegram message
   */
  private logCommand(commandName: string, msg: TelegramBot.Message): void {
    const timestamp = new Date().toISOString();
    const userId = msg.from?.id || 'unknown';
    const username = msg.from?.username || 'unknown';
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    
    const logEntry = `${timestamp} [CMD:${commandName}] User:${userId}(${username}) Chat:${chatId}(${chatType})`;
    this.commandLog.push(logEntry);
    
    // Keep log at a reasonable size
    if (this.commandLog.length > 1000) {
      this.commandLog.shift();
    }
  }

  /**
   * Get recent command log entries
   * @param count Number of entries to retrieve
   * @returns Array of log entries
   */
  getCommandLog(count = 10): string[] {
    return this.commandLog.slice(-count);
  }
}

// Export singleton instance
export const commandRegistry = new CommandRegistry();