
export const TELEGRAM_CONFIG = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  channelId: process.env.TELEGRAM_CHANNEL_ID || '',
  webhookSecret: process.env.WEBHOOK_SECRET || 'your-webhook-secret',
};
