import express from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { getBot, initializeBot } from "./telegram/bot";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "@db";
import { sql } from "drizzle-orm";
import { promisify } from "util";
import { exec } from "child_process";
import { createServer, Server } from "http";
import fetch from "node-fetch";
import { RateLimiterMemory } from 'rate-limiter-flexible';
import * as fs from 'fs';

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiter setup
const apiLimiter = new RateLimiterMemory({
  points: 60,         // Number of points
  duration: 60,       // Per 60 seconds
  blockDuration: 60,  // Block for 1 minute if exceeded
});

async function setupMiddleware() {
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  // API rate limiting middleware
  app.use('/api/', async (req, res, next) => {
    try {
      await apiLimiter.consume(req.ip || 'anonymous');
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
    // Find processes using the port
    const { stdout } = await execAsync(`lsof -t -i:${PORT}`);
    if (stdout) {
      const pids = stdout.split('\n').filter(Boolean);
      // Kill each process
      for (const pid of pids) {
        try {
          process.kill(parseInt(pid), 'SIGTERM');
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e) {
          log(`Failed to kill process ${pid}`);
        }
      }
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    log("No existing process found on port " + PORT);
  }
}

async function cleanupBot() {
  try {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      log("No Telegram bot token found, skipping bot cleanup");
      return;
    }

    // Create a cleanup lock file
    const lockFile = '.bot-cleanup.lock';
    if (await fs.promises.access(lockFile).catch(() => false)) {
      log("Bot cleanup already in progress");
      return;
    }

    try {
      await fs.promises.writeFile(lockFile, Date.now().toString());

      // Stop existing bot instance if running
      const currentBot = getBot();
      if (currentBot) {
        try {
          await currentBot.stopPolling();
          log("Stopped existing bot polling");
        } catch (e) {
          log("Error stopping existing bot:", e);
        }
      }

      // Clear webhook and pending updates
      const response = await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/deleteWebhook`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ drop_pending_updates: true })
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete webhook: ${response.status}`);
      }

      log("Cleared existing webhook configuration and pending updates");

      // Wait for cleanup to take effect
      await new Promise(resolve => setTimeout(resolve, 2000));
    } finally {
      // Remove lock file
      await fs.promises.unlink(lockFile).catch(() => {});
    }
  } catch (error) {
    console.error("Error cleaning up bot:", error);
    throw error;
  }
}

let server: Server | null = null;

async function startServer() {
  try {
    log("Starting server initialization...");

    // Ensure clean state before starting
    await cleanupBot();
    await cleanupPort();
    await checkDatabase();

    server = createServer(app);

    // Setup middleware and routes
    await setupMiddleware();
    registerRoutes(app);

    // Setup Vite or serve static files based on environment
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    return new Promise((resolve, reject) => {
      server!.listen(PORT)
        .on("error", async (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            log(`Port ${PORT} is in use, attempting to free it...`);
            await cleanupPort();
            server!.listen(PORT);
          } else {
            console.error(`Failed to start server: ${err.message}`);
            reject(err);
          }
        })
        .on("listening", async () => {
          log(`🌍 Server running on port ${PORT}`);

          // Initialize Telegram bot after server is ready
          if (process.env.TELEGRAM_BOT_TOKEN) {
            try {
              log("🚀 Starting Telegram Bot...");
              const botInstance = await initializeBot();
              if (!botInstance) {
                throw new Error("Failed to initialize bot");
              }
              log("✅ Telegram bot initialized successfully");
            } catch (error) {
              console.error("⚠️ Telegram bot failed to start:", error);
              // Continue server startup even if bot fails
            }
          } else {
            log("⚠️ No Telegram bot token found, skipping bot initialization");
          }

          resolve(server);
        });
    });
  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
}

// Graceful shutdown handler
async function shutdown() {
  log("🛑 Shutting down server and bot...");

  // Stop the bot first
  const currentBot = getBot();
  if (currentBot) {
    try {
      await currentBot.stopPolling();
      log("✅ Bot polling stopped");
    } catch (error) {
      console.error("Error stopping bot:", error);
    }
  }

  // Close server connections
  if (server) {
    try {
      await new Promise((resolve) => {
        server!.close(() => {
          log("✅ Server connections closed");
          resolve(true);
        });
      });
    } catch (error) {
      console.error("Error closing server:", error);
    }
  }

  process.exit(0);
}

// Register shutdown handlers
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Initialize application
startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});