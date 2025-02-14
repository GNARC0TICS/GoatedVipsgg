import express, { Express } from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";
import { exec } from "child_process";
import { sql } from "drizzle-orm";
import { log } from "./telegram/utils/logger";
import { bot } from "./telegram/bot";
import { registerRoutes } from "./routes";
import { initializeAdmin } from "./middleware/admin";
import { setupVite, serveStatic } from "./vite";
import db from "../db";

const execAsync = promisify(exec);
const PORT = Number(process.env.PORT || 5000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Server state flags
let isServerReady = false;

async function setupMiddleware(app: express.Application) {
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());

  // Enhanced health check endpoint
  app.get("/api/health", (_req, res) => {
    res.set('Cache-Control', 'no-store').json({
      status: isServerReady ? "healthy" : "initializing",
      timestamp: new Date().toISOString(),
      port: PORT,
      env: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      ready: isServerReady
    });
  });
}

async function startServer() {
  try {
    log("Starting server initialization...");
    isServerReady = false;

    // Check database connection
    const dbConnected = await db.execute(sql`SELECT 1`);
    if (!dbConnected) {
      throw new Error("Failed to connect to database");
    }
    log("Database connection established successfully");

    const app = express();
    app.set('trust proxy', 1);

    await setupMiddleware(app);
    const server = createServer(app);

    // Setup routes before static file serving
    registerRoutes(app);
    await initializeAdmin().catch(console.error);

    if (process.env.NODE_ENV === 'production') {
      // In production, serve static files directly
      serveStatic(app);
    } else {
      // In development, use Vite middleware
      await setupVite(app, server);
    }

    // Start the server with enhanced error handling
    return new Promise((resolve, reject) => {
      const serverInstance = server.listen(PORT, "0.0.0.0", async () => {
        log(`Server listening on port ${PORT}`);

        // Set initial server state
        isServerReady = true;
        process.env.SERVER_READY = 'true';

        // Signal that port is available for the feedback tool
        process.env.REPLIT_PORT = PORT.toString();

        log("Server is fully initialized and ready");
        resolve(serverInstance);
      });

      serverInstance.on('error', (error: NodeJS.ErrnoException) => {
        log(`Server error: ${error.message}`);
        reject(error);
      });

      // Shorter timeout for faster feedback
      setTimeout(() => {
        if (!isServerReady) {
          const error = new Error("Server startup timed out");
          log(error.message);
          reject(error);
        }
      }, 10000); // 10 second timeout
    });
  } catch (error) {
    log(`Failed to start application: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

// Graceful shutdown handling
process.on("SIGTERM", async () => {
  log("Received SIGTERM signal. Shutting down gracefully...");
  isServerReady = false;
  if (bot) await bot.stopPolling();
  process.exit(0);
});

process.on("SIGINT", async () => {
  log("Received SIGINT signal. Shutting down gracefully...");
  isServerReady = false;
  if (bot) await bot.stopPolling();
  process.exit(0);
});

// Export the startServer function and server state
export { startServer, isServerReady };

// Only start the server if this is the main module
if (import.meta.url === import.meta.resolve('./index.ts')) {
  startServer().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}