import express from 'express';
import { bot, handleUpdate } from '../telegram/bot';
import type TelegramBot from 'node-telegram-bot-api';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const router = express.Router();

// Enhanced rate limiter for webhook endpoint
const webhookLimiter = new RateLimiterMemory({
  points: 100,    // Number of requests
  duration: 60,   // Per minute
  blockDuration: 60 // Block for 1 minute if exceeded
});

// Dedicated webhook route with improved error handling
router.post('/', express.json(), async (req, res) => {
  const ip = req.ip || 'unknown';

  try {
    // Apply rate limiting
    await webhookLimiter.consume(ip);

    if (!bot) {
      console.error('Bot not initialized');
      return res.sendStatus(503); // Service Unavailable
    }

    // Type assertion and validation for the update object
    const update = req.body as TelegramBot.Update;
    if (!update || (!update.message && !update.callback_query)) {
      return res.sendStatus(400); // Bad Request
    }

    // Process update
    await handleUpdate(update);

    res.sendStatus(200);
  } catch (error) {
    if (error.consumedPoints) {
      // Rate limit exceeded
      return res.status(429).json({
        status: 'error',
        message: 'Too many requests',
        retryAfter: Math.ceil(error.msBeforeNext / 1000)
      });
    }

    console.error('Error processing webhook:', error);
    res.sendStatus(500);
  }
});

export default router;