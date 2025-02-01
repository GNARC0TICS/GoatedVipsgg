
import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import { TELEGRAM_CONFIG } from '../config/telegram';

const router = express.Router();
const bot = new TelegramBot(TELEGRAM_CONFIG.botToken, { polling: false });

// Webhook endpoint
router.post('/webhook', async (req, res) => {
  const secret = req.headers['x-webhook-secret'];
  
  if (secret !== TELEGRAM_CONFIG.webhookSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const data = req.body;
    
    // Send to Telegram channel
    await bot.sendMessage(
      TELEGRAM_CONFIG.channelId,
      `🔔 New Event:\n${JSON.stringify(data, null, 2)}`,
      { parse_mode: 'HTML' }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

export default router;
