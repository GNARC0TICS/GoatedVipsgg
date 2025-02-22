import { z } from 'zod';

/**
 * Telegram Bot Logging Utility
 * Provides structured logging functionality for the Telegram bot
 * with support for different log levels and action tracking
 */

/**
 * Logging level type
 */
type LogLevel = 'info' | 'error' | 'debug';

/**
 * Standard logging function with emoji indicators for log levels
 * @param message The message to log
 * @param level The log level (info, error, or debug)
 */
export function log(message: string, level: LogLevel = 'info'): void {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = level === 'error' ? '❌' : level === 'debug' ? '🔍' : '✨';
  console.log(`[Telegram Bot] ${timestamp} - ${prefix} ${message}`);
}

/**
 * Error logging with context and optional stack trace
 * @param error The error object or unknown error
 * @param context Description of where/when the error occurred
 */
export function logError(error: unknown, context: string = 'Unknown context'): void {
  if (error instanceof Error) {
    log(`${context}: ${error.message}`, 'error');
    if (error.stack) {
      log(`Stack trace: ${error.stack}`, 'debug');
    }
  } else {
    log(`${context}: ${String(error)}`, 'error');
  }
}

/**
 * Schema for structured action logging
 */
export const LogPayloadSchema = z.union([
  z.string(),
  z.object({
    action: z.string(),
    userId: z.string().optional(),
    success: z.boolean(),
    details: z.string().optional()
  })
]);

export type LogPayload = z.infer<typeof LogPayloadSchema>;

/**
 * Structured action logging with validation
 * @param payload The action log payload or message string
 */
export function logAction(payload: LogPayload): void {
  try {
    const validPayload = LogPayloadSchema.parse(payload);

    if (typeof validPayload === 'string') {
      log(validPayload);
      return;
    }

    // Handle structured payloads
    const status = validPayload.success ? '✅' : '❌';
    const userInfo = validPayload.userId ? `[User: ${validPayload.userId}]` : '';
    const details = validPayload.details ? `: ${validPayload.details}` : '';

    log(`${status} ${validPayload.action} ${userInfo}${details}`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(error, 'Invalid log payload');
    } else {
      logError(error, 'Unknown logging error');
    }
  }
}