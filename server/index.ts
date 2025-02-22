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
import { bot } from './telegram/bot';

const execAsync = promisify(exec);
const app = express();
const PORT = 5000;

// Validate critical environment variables
function validateEnvironment() {
  const requiredEnvVars = [
    'DATABASE_URL',
    'TELEGRAM_BOT_TOKEN',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please ensure all required environment variables are set before starting the server.'
    );
  }
}

async function setupMiddleware() {
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(requestLogger);
  app.use(errorHandler);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "healthy" });
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
    // Try to kill existing process on port 5000
    await execAsync(`lsof -ti:${PORT} | xargs kill -9`);
    // Wait a moment for the port to be released
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    // If no process was found or killed, that's fine
    log("No existing process found on port " + PORT);
  }
}

async function startServer() {
  try {
    log("Starting server initialization...");

    // Validate environment variables before proceeding
    validateEnvironment();

    await checkDatabase();
    await cleanupPort();

    registerRoutes(app);
    initializeAdmin().catch(console.error);

    // Initialize Telegram bot with proper error handling
    log("Initializing Telegram bot...");
    try {
      const server = createServer(app);

      if (app.get("env") === "development") {
        await setupVite(app, server);
      } else {
        serveStatic(app);
      }

      await setupMiddleware();

      server
        .listen(PORT, "0.0.0.0")
        .on("error", async (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            log(`Port ${PORT} is in use, attempting to free it...`);
            await cleanupPort();
            server.listen(PORT, "0.0.0.0");
          } else {
            console.error(`Failed to start server: ${err.message}`);
            process.exit(1);
          }
        })
        .on("listening", () => {
          log(`Server running on port ${PORT} (http://0.0.0.0:${PORT})`);
          log('Telegram bot started successfully');
        });

    } catch (botError) {
      console.error("Failed to initialize Telegram bot:", botError);
      // Continue server startup even if bot fails
      log("Warning: Telegram bot failed to initialize. Some features may be unavailable.");
    }

  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
}

// Add Telegram bot shutdown handling
process.on('SIGTERM', () => {
  log('Received SIGTERM signal. Shutting down gracefully...');
  bot.stopPolling(); // Stop the Telegram bot
  process.exit(0);
});

process.on('SIGINT', () => {
  log('Received SIGINT signal. Shutting down gracefully...');
  bot.stopPolling(); // Stop the Telegram bot
  process.exit(0);
});

startServer();