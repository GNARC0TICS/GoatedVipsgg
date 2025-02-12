import express from 'express';
import { bot, handleUpdate } from '../telegram/bot';
import type TelegramBot from 'node-telegram-bot-api';

const router = express.Router();

// Webhook route for Telegram bot
router.post('/', express.json(), (req, res) => {
  if (!bot) {
    return res.sendStatus(500);
  }

  try {
    // Type assertion for the update object
    const update = req.body as TelegramBot.Update;
    handleUpdate(update);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.sendStatus(500);
  }
});

export default router;