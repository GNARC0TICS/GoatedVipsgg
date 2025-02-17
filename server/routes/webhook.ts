import express, { Request, Response, NextFunction } from "express";
import botUtils from "../telegram/bot";
import type TelegramBot from "node-telegram-bot-api";
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { log } from "../utils/logger";

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

    log("info", `Received webhook update from ${ip}`);
    log("debug", `Webhook payload: ${JSON.stringify(req.body, null, 2)}`);

    const bot = botUtils.getBot();
    if (!bot) {
      log("error", "Webhook error: Bot not initialized");
      return res.sendStatus(503); // Service Unavailable
    }

    // Validate incoming update
    const update = req.body as TelegramBot.Update;
    if (!update || !update.update_id) {
      log("error", `Webhook error: Invalid update payload: ${JSON.stringify(req.body)}`);
      return res.sendStatus(400); // Bad Request
    }

    log("info", `Processing update ID: ${update.update_id}`);

    // Process update using the handler
    await botUtils.handleUpdate(update);
    log("info", `Successfully processed update ID: ${update.update_id}`);

    return res.sendStatus(200);

  } catch (error: any) {
    if (isRateLimiterError(error)) {
      log("warn", `Rate limit exceeded for IP: ${ip}`);
      return res.status(429).json({
        status: "error",
        message: "Too many requests",
        retryAfter: Math.ceil(error.msBeforeNext / 1000),
      });
    }

    log("error", `Error processing webhook: ${error.message}`);
    console.error("Webhook error details:", error);
    return res.sendStatus(500);
  }
});

export default router;