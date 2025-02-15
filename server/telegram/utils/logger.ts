import { z } from 'zod';

export function log(message: string, level: 'info' | 'error' | 'debug' = 'info'): void {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = level === 'error' ? '❌' : level === 'debug' ? '🔍' : '✨';
  console.log(`[Telegram Bot] ${timestamp} - ${prefix} ${message}`);
}

export function logError(error: unknown, context: string): void {
  if (error instanceof Error) {
    log(`${context}: ${error.message}`, 'error');
    if (error.stack) {
      log(`Stack trace: ${error.stack}`, 'debug');
    }
  } else {
    log(`${context}: Unknown error type`, 'error');
  }
}

const LogPayloadSchema = z.object({
  action: z.string(),
  userId: z.string().optional(),
  success: z.boolean(),
  details: z.string().optional()
});

type LogPayload = z.infer<typeof LogPayloadSchema>;

export function logAction(payload: LogPayload): void {
  try {
    const validPayload = LogPayloadSchema.parse(payload);
    const status = validPayload.success ? '✅' : '❌';
    const userInfo = validPayload.userId ? `[User: ${validPayload.userId}]` : '';
    const details = validPayload.details ? `: ${validPayload.details}` : '';

    log(`${status} ${validPayload.action} ${userInfo}${details}`);
  } catch (error) {
    logError(error, 'Invalid log payload');
  }
}