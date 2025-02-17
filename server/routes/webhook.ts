import express, { Request, Response, NextFunction } from "express";
import { bot, handleUpdate } from "../telegram/bot";
import type TelegramBot from "node-telegram-bot-api";
import { RateLimiterMemory } from "rate-limiter-flexible";

const router = express.Router();

// Enhanced rate limiter for webhook endpoint
const webhookLimiter = new RateLimiterMemory({
  points: 100,    // Number of requests
  duration: 60,   // Per minute
  blockDuration: 60 // Block for 1 minute if exceeded
});

// Type guard for rate limiter error
const isRateLimiterError = (error: any): error is { consumedPoints: number; msBeforeNext: number } => {
  return error && typeof error.consumedPoints === "number" && typeof error.msBeforeNext === "number";
};

router.post("/", express.json(), async (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || "unknown";

  try {
    // Apply rate limiting
    await webhookLimiter.consume(ip);

    if (!bot) {
      console.error("Webhook error: Bot not initialized");
      return res.sendStatus(503); // Service Unavailable
    }

    // Validate incoming update
    const update = req.body as TelegramBot.Update;
    if (!update) {
      console.error("Webhook error: Invalid update payload", req.body);
      return res.sendStatus(400); // Bad Request
    }

    // Process all types of updates
    try {
      if (update.message) {
        // Handle commands directly
        const msg = update.message;
        if (msg.text?.startsWith('/')) {
          // This is a command
          const command = msg.text.split(' ')[0]; // Get the command part
          console.log(`Received command: ${command}`);
          
          // Pass to bot instance for processing
          await bot.emit('message', msg);
        } else {
          // Regular message
          await bot.emit('message', msg);
        }
      } else if (update.callback_query) {
        await bot.emit('callback_query', update.callback_query);
      } else if (update.channel_post) {
        await bot.emit('channel_post', update.channel_post);
      }
    } catch (error) {
      console.error('Error processing update:', error);
    }

    return res.sendStatus(200);
  } catch (error: any) {
    if (isRateLimiterError(error)) {
      // Rate limit exceeded
      return res.status(429).json({
        status: "error",
        message: "Too many requests",
        retryAfter: Math.ceil(error.msBeforeNext / 1000),
      });
    }

    console.error("Error processing webhook:", error);
    return res.sendStatus(500);
  }
});

export default router;
