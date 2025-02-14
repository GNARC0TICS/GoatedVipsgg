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
import webhookRouter from "./routes/webhook";
import bonusChallengesRouter from "./routes/bonus-challenges";

const execAsync = promisify(exec);
const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Rate limiter setup
const apiLimiter = new RateLimiterMemory({
  points: 60,
  duration: 60,
  blockDuration: 60,
});

async function setupMiddleware() {
  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  // API request logging
  app.use('/api', (req, res, next) => {
    log(`API Request: ${req.method} ${req.path}`);
    const originalJson = res.json;
    res.json = function(body) {
      log(`API Response for ${req.path}: ${JSON.stringify(body).slice(0, 200)}`);
      return originalJson.call(this, body);
    };
    next();
  });

  // API rate limiting middleware
  app.use('/api/', async (req, res, next) => {
    try {
      await apiLimiter.consume(req.ip || 'unknown');
      next();
    } catch (error) {
      res.status(429).json({
        status: 'error',
        message: 'Too many requests. Please try again later.'
      });
    }
  });

  // CORS headers for API routes
  app.use('/api', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });
}

async function setupAPIRoutes() {
  // Mount API routes with explicit paths
  app.use("/api", bonusChallengesRouter);
  app.use("/api/webhook", webhookRouter);
  registerRoutes(app);
}

async function setupFrontendRoutes() {
  if (app.get("env") === "development") {
    await setupVite(app, app);
  } else {
    serveStatic(app);
  }
}

async function startServer() {
  try {
    log("Starting server initialization...");
    await checkDatabase();
    await cleanupBot();
    await cleanupPort();

    // Initialize middleware first
    await setupMiddleware();
    log("Middleware setup complete");

    // Mount API routes before frontend routes
    await setupAPIRoutes();
    log("API routes mounted");

    // Setup frontend routes last
    await setupFrontendRoutes();
    log("Frontend routes mounted");

    const server = createServer(app);

    return new Promise((resolve, reject) => {
      server.listen(PORT, "0.0.0.0", () => {
        log(`🚀 Server running on port ${PORT}`);

        // Initialize Telegram bot after server is ready
        initializeBot()
          .then((botInstance) => {
            if (!botInstance) {
              log("⚠️ Warning: Bot initialization failed");
            } else {
              log("✅ Telegram bot initialized successfully");
            }
            resolve(true);
          })
          .catch((error) => {
            console.error("⚠️ Telegram bot failed to start:", error);
            resolve(true); // Still resolve as server is running
          });
      });

      server.on("error", (err: NodeJS.ErrnoException) => {
        console.error(`Failed to start server: ${err.message}`);
        reject(err);
      });

      // Graceful shutdown handler
      process.on("SIGINT", async () => {
        log("🛑 Shutting down server and bot...");
        if (bot) {
          try {
            await bot.deleteWebHook();
            log("✅ Bot webhook removed");
          } catch (error) {
            console.error("Error cleaning up bot:", error);
          }
        }
        server.close(() => {
          process.exit(0);
        });
      });
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

async function checkDatabase() {
  try {
    await db.execute(sql`SELECT 1`);
    log("Database connection successful");
  } catch (error: any) {
    if (error.message?.includes("endpoint is disabled")) {
      log("Database endpoint is disabled. Please enable the database in the Replit Database tab.");
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

// Start the server
startServer()
  .then(() => log("✅ Server startup complete"))
  .catch((error) => {
    console.error("Error during startup:", error);
    process.exit(1);
  });