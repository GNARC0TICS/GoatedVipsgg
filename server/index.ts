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

const execAsync = promisify(exec);
const mainApp = express();  // Main app for Vite
const apiApp = express();   // Separate app for API
const MAIN_PORT = Number(process.env.PORT) || 5000;
const API_PORT = Number(process.env.API_PORT) || 5001;

// Rate limiter setup
const apiLimiter = new RateLimiterMemory({
  points: 60,
  duration: 60,
  blockDuration: 60,
});

async function setupApiMiddleware() {
  apiApp.use(express.json());
  apiApp.use(express.urlencoded({ extended: false }));
  apiApp.use(cookieParser());

  // API rate limiting middleware
  apiApp.use('/', async (req, res, next) => {
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

  // Mount all API routes
  registerRoutes(apiApp);
  apiApp.use("/webhook", webhookRouter);

  apiApp.use(requestLogger);
  apiApp.use(errorHandler);
}

async function setupMainMiddleware() {
  mainApp.use(cookieParser());

  if (process.env.NODE_ENV === "development") {
    await setupVite(mainApp, createServer(mainApp));
  } else {
    serveStatic(mainApp);
  }
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
    const duration = Date.now() - start;
    let logMessage = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
    if (capturedResponse) {
      logMessage += ` :: ${JSON.stringify(capturedResponse)}`;
    }
    log(logMessage.slice(0, 79) + (logMessage.length > 79 ? "…" : ""));
  });

  next();
}

function errorHandler(
  err: Error | any,
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
      log("Database endpoint is disabled. Please enable the database in the Replit Database tab.");
    } else {
      throw error;
    }
  }
}

async function cleanupPort(port: number) {
  try {
    await execAsync(`lsof -ti:${port} | xargs kill -9`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    log("No existing process found on port " + port);
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

async function startServer() {
  try {
    log("Starting server initialization...");
    await checkDatabase();
    await cleanupBot();
    await Promise.all([
      cleanupPort(MAIN_PORT),
      cleanupPort(API_PORT)
    ]);

    // Set up both middleware stacks
    await Promise.all([
      setupApiMiddleware(),
      setupMainMiddleware()
    ]);

    return new Promise((resolve, reject) => {
      // Start API server
      const apiServer = apiApp.listen(API_PORT, "0.0.0.0", () => {
        log(`🚀 API Server running on port ${API_PORT}`);
      });

      // Start main server
      const mainServer = mainApp.listen(MAIN_PORT, "0.0.0.0", () => {
        log(`🚀 Main Server running on port ${MAIN_PORT}`);

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
            resolve(true);
          });
      });

      // Error handling for both servers
      apiServer.on("error", async (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          log(`Port ${API_PORT} is in use, attempting to free it...`);
          await cleanupPort(API_PORT);
          apiApp.listen(API_PORT, "0.0.0.0", () => {
            log(`🚀 API Server running on port ${API_PORT} after retry`);
          });
        } else {
          console.error(`Failed to start API server: ${err.message}`);
          reject(err);
        }
      });

      mainServer.on("error", async (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          log(`Port ${MAIN_PORT} is in use, attempting to free it...`);
          await cleanupPort(MAIN_PORT);
          mainApp.listen(MAIN_PORT, "0.0.0.0", () => {
            log(`🚀 Main Server running on port ${MAIN_PORT} after retry`);
          });
        } else {
          console.error(`Failed to start main server: ${err.message}`);
          reject(err);
        }
      });

      // Graceful shutdown handler
      process.on("SIGINT", async () => {
        log("🛑 Shutting down servers and bot...");
        if (bot) {
          try {
            await bot.deleteWebHook();
            log("✅ Bot webhook removed");
          } catch (error) {
            console.error("Error cleaning up bot:", error);
          }
        }
        apiServer.close();
        mainServer.close(() => {
          process.exit(0);
        });
      });
    });
  } catch (error) {
    console.error("Failed to start servers:", error);
    process.exit(1);
  }
}

startServer()
  .then(() => log("✅ Server startup complete"))
  .catch((error) => {
    console.error("Error during startup:", error);
    process.exit(1);
  });