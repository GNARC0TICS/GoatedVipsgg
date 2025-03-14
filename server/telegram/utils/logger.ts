/**
 * Logger utility for the Telegram bot
 */

// Define log context interface
export interface LogContext {
  command?: string;
  chatId?: number;
  userId?: number;
  username?: string;
  error?: string | Error;
  [key: string]: any;
}

// Create structured logger
const logger = {
  info: (message: string, context?: LogContext) => {
    console.log(`[Telegram Bot] ${message}`, context || "");
  },
  warn: (message: string, context?: LogContext) => {
    console.warn(`[Telegram Bot] WARNING: ${message}`, context || "");
  },
  error: (message: string, context?: LogContext) => {
    console.error(`[Telegram Bot] ERROR: ${message}`, context || "");
  },
  debug: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[Telegram Bot] DEBUG: ${message}`, context || "");
    }
  },
};

export { logger };
