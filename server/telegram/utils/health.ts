
import { logger } from './logger';
import type TelegramBot from 'node-telegram-bot-api';

export interface BotHealth {
  isPolling: boolean;
  uptime: number;
  lastPingTime?: number;
  lastPingLatency?: number;
  errors: number;
}

class HealthMonitor {
  private errors: number = 0;
  private lastPingTime?: number;
  private lastPingLatency?: number;
  private bot?: TelegramBot;

  initialize(bot: TelegramBot) {
    this.bot = bot;
    this.startHealthChecks();
  }

  private async pingBot() {
    if (!this.bot) return;
    
    try {
      const start = Date.now();
      await this.bot.getMe();
      const latency = Date.now() - start;
      
      this.lastPingTime = Date.now();
      this.lastPingLatency = latency;
      
      if (latency > 5000) {
        logger.warn('High bot latency detected', { latency });
      }
    } catch (error) {
      this.errors++;
      logger.error('Health check failed', { 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private startHealthChecks() {
    // Run health check every 5 minutes
    setInterval(() => this.pingBot(), 300000);
  }

  getHealth(): BotHealth {
    return {
      isPolling: !!this.bot,
      uptime: process.uptime(),
      lastPingTime: this.lastPingTime,
      lastPingLatency: this.lastPingLatency,
      errors: this.errors
    };
  }
}

export const healthMonitor = new HealthMonitor();
