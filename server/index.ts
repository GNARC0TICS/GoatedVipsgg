import express from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { bot, initializeBot } from "./telegram/bot";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "@db";
import { sql } from "drizzle-orm";
import { promisify } from "util";
import { exec } from "child_process";
import { createServer } from "http";
import fetch from "node-fetch";
import { RateLimiterMemory } from 'rate-limiter-flexible';
import webhookRouter from "./routes/webhook"; // Import your webhook routes

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiter setup
const apiLimiter = new RateLimiterMemory({
  points: 60,
  duration: 60,
  blockDuration: 60,
});

async function setupMiddleware() {
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  // API rate limiting middleware
  app.use('/api/', async (req, res, next) => {
    try {
      await apiLimiter.consume(req.ip);
      next();
    } catch (error) {
      res.status(429).json({
        status: 'error',
        message: 'Too many requests. Please try again later.'
      });
    }
  });

  app.use(requestLogger);
  app.use(errorHandler);
}

function requestLogger(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const start = Date.now();
  const path = req.path;
  let capturedResponse: Record<string, any> | undefined;

  const originalJson = res.json;
  res.json = function (body, ...args) {
    capturedResponse = body;
    return originalJson.apply(res, [body, ...args]);
  };

  res.on("finish", () => {
    if (path.startsWith("/api")) {
      const duration = Date.now() - start;
      let logMessage = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedResponse) {
        logMessage += ` :: ${JSON.stringify(capturedResponse)}`;
      }
      log(logMessage.slice(0, 79) + (logMessage.length > 79 ? "…" : ""));
    }
  });

  next();
}

function errorHandler(
  err: Error,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction,
) {
  console.error("Server error:", err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
}

async function checkDatabase() {
  try {
    await db.execute(sql`SELECT 1`);
    log("Database connection successful");
  } catch (error: any) {
    if (error.message?.includes("endpoint is disabled")) {
      log(
        "Database endpoint is disabled. Please enable the database in the Replit Database tab.",
      );
    } else {
      throw error;
    }
  }
}

async function cleanupPort() {
  try {
    await execAsync(`lsof -ti:${PORT} | xargs kill -9`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    log("No existing process found on port " + PORT);
  }
}

async function cleanupBot() {
  try {
    if (process.env.TELEGRAM_BOT_TOKEN) {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/deleteWebhook?drop_pending_updates=true`);
      log("Cleared existing webhook configuration");
    }
  } catch (error) {
    console.error("Error cleaning up bot:", error);
  }
}

async function startMainServer() {
  try {
    log("Starting main server initialization...");
    await checkDatabase();
    await cleanupBot();
    await cleanupPort();

    // Setup middleware and routes for main app
    await setupMiddleware();
    registerRoutes(app);

    // Setup Vite or serve static files based on environment
    if (app.get("env") === "development") {
      await setupVite(app, createServer(app));
    } else {
      serveStatic(app);
    }

    return new Promise((resolve, reject) => {
      app.listen(PORT, "0.0.0.0")
        .on("error", async (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            log(`Port ${PORT} is in use, attempting to free it...`);
            await cleanupPort();
            app.listen(PORT, "0.0.0.0");
          } else {
            console.error(`Failed to start main server: ${err.message}`);
            reject(err);
          }
        })
        .on("listening", async () => {
          log(`🌍 Main server running on port ${PORT} (http://0.0.0.0:${PORT})`);

          // Initialize Telegram bot after server is ready
          try {
            log("🚀 Starting Telegram Bot...");
            const botInstance = await initializeBot();
            if (!botInstance) {
              throw new Error("Failed to initialize bot");
            }
            log("✅ Telegram bot initialized successfully");
          } catch (error) {
            console.error("⚠️ Telegram bot failed to start:", error);
          }

          resolve(true);
        });
    });
  } catch (error) {
    console.error("Failed to start main server:", error);
    process.exit(1);
  }
}

async function startWebhookServer() {
  // Create a new Express instance for the webhook
  const webhookApp = express();

  // Use JSON middleware. (If you need raw body for signature verification, consider adding a verify function.)
  webhookApp.use(express.json());

  // Register only the webhook route
  webhookApp.use("/webhook", webhookRouter);

  // Listen on port 5001 for webhook requests
  webhookApp.listen(5001, "0.0.0.0", () => {
    log("🚀 Webhook server running on port 5001 (accessible externally on port 3000)");
  });
}

// Initialize both servers concurrently
Promise.all([startMainServer(), startWebhookServer()])
  .then(() => log("Both main and webhook servers are running"))
  .catch((error) => {
    console.error("Error starting servers:", error);
    process.exit(1);
  });

// Graceful shutdown handler remains the same
process.on("SIGINT", async () => {
  log("🛑 Shutting down servers and bot...");
  if (bot) {
    try {
      await bot.stopPolling();
      log("✅ Bot polling stopped");
    } catch (error) {
      console.error("Error stopping bot:", error);
    }
  }
  process.exit(0);
});