// Load environment variables first, before any other imports
import * as dotenv from 'dotenv';
dotenv.config();

// Validate critical environment variables
const requiredEnvVars = [
  'ADMIN_USERNAME', 
  'ADMIN_PASSWORD', 
  'ADMIN_SECRET_KEY',
  'TELEGRAM_BOT_TOKEN'
];

console.log('Environment variable check:');
let missingVars = false;
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    missingVars = true;
  } else {
    console.log(`✓ ${envVar} is set`);
  }
}

if (missingVars) {
  console.warn('Some required environment variables are missing. This may cause issues with authentication and bot functionality.');
}

// Regular imports
import express from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "@db";
import { sql } from "drizzle-orm";
import { promisify } from "util";
import { exec } from "child_process";
import { createServer } from "http";
import { initializeAdmin } from "./middleware/admin";
import bot, { stopBot, getBotStatus } from './telegram/bot';
import { apiRateLimiter, affiliateRateLimiter, raceRateLimiter } from './middleware/rate-limiter';
import fetch from 'node-fetch';

const execAsync = promisify(exec);
const app = express();
const PORT = 5000;

async function setupMiddleware() {
  // Basic middleware
  app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  // Rate limiters - apply before routes but after basic middleware
  app.use('/api', apiRateLimiter);
  app.use('/api/affiliate/stats', affiliateRateLimiter);
  app.use('/api/races', raceRateLimiter);

  // Logging and error handling
  app.use(requestLogger);
  app.use(errorHandler);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // Add a Telegram bot status endpoint for debugging
  app.get("/api/telegram/status", (_req, res) => {
    try {
      const status = getBotStatus();
      res.json({ 
        status: "ok", 
        telegramBot: status,
        timestamp: new Date().toISOString() 
      });
    } catch (error) {
      console.error("Error getting bot status:", error);
      res.status(500).json({ 
        status: "error", 
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      });
    }
  });
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
    return true;
  } catch (error: any) {
    if (error.message?.includes("endpoint is disabled")) {
      log(
        "Database endpoint is disabled. Please enable the database in the Replit Database tab.",
      );
    } else {
      console.error("Database connection error:", error);
    }
    return false;
  }
}

async function cleanupPort() {
  try {
    await execAsync(`lsof -ti:${PORT} | xargs kill -9`);
    // Wait for port to be released
    await new Promise(resolve => setTimeout(resolve, 1000));
    log(`Port ${PORT} is now available`);
    return true;
  } catch (error) {
    log("No existing process found on port " + PORT);
    return true;
  }
}

async function waitForPort(port: number, retries = 5): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`http://0.0.0.0:${port}/api/health`);
      if (response.ok) {
        log(`Server is ready on port ${port}`);
        return true;
      }
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return false;
}

async function startServer() {
  try {
    log("Starting server initialization...");

    // Ensure database is ready
    if (!await checkDatabase()) {
      throw new Error("Database connection failed");
    }

    // Ensure port is available
    if (!await cleanupPort()) {
      throw new Error("Failed to clean up port");
    }

    const server = createServer(app);

    // Setup middleware first
    await setupMiddleware();

    // Then register routes
    registerRoutes(app);
    initializeAdmin().catch(console.error);

    // Initialize Telegram bot
    log("Initializing Telegram bot...");
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN must be provided');
    }

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start server with proper error handling
    await new Promise<void>((resolve, reject) => {
      server
        .listen(PORT, "0.0.0.0")
        .once('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            log(`Port ${PORT} is in use, attempting to free it...`);
            cleanupPort().then(() => {
              server.listen(PORT, "0.0.0.0");
            });
          } else {
            reject(err);
          }
        })
        .once('listening', () => {
          log(`Server running on port ${PORT} (http://0.0.0.0:${PORT})`);
          log('Telegram bot started successfully');
          resolve();
        });
    });

    // Wait for server to be ready
    if (!await waitForPort(PORT)) {
      throw new Error("Server failed to become ready");
    }

  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
}

// Add Telegram bot shutdown handling
process.on('SIGTERM', () => {
  log('Received SIGTERM signal. Shutting down gracefully...');
  stopBot(); // Stop the Telegram bot
  process.exit(0);
});

process.on('SIGINT', () => {
  log('Received SIGINT signal. Shutting down gracefully...');
  stopBot(); // Stop the Telegram bot
  process.exit(0);
});

startServer();