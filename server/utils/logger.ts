
import { z } from 'zod';

const LogLevelSchema = z.enum(['info', 'error', 'debug']);
type LogLevel = z.infer<typeof LogLevelSchema>;

export function log(message: string, level: LogLevel = 'info'): void {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = level === 'error' ? '❌' : level === 'debug' ? '🔍' : '✨';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

export function logError(message: string, error?: any): void {
  log(message, 'error');
  if (error) {
    console.error(error);
  }
}

export function logAction(message: string, info?: any): void {
  log(message, 'info');
  if (info) {
    console.log(info);
  }
}
