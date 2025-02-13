import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { promisify } from "util";
import { exec } from "child_process";
import { sql } from "drizzle-orm";
import { log } from "./telegram/utils/logger";
import { bot } from "./telegram/bot";
import { registerRoutes } from "./routes";
import { initializeAdmin } from "./middleware/admin";
import db from "../db";
import viteConfig from "../vite.config";

const execAsync = promisify(exec);
const PORT = Number(process.env.PORT || 5000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupVite(app: express.Application, server: any) {
  const viteLogger = createLogger();
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    try {
      const url = req.originalUrl;
      const template = fs.readFileSync(
        path.resolve(__dirname, "..", "client", "index.html"),
        "utf-8"
      );

      const html = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      next(error);
    }
  });
}

async function serveStatic(app: express.Application) {
  const distPath = path.resolve(__dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}. Please build the client first.`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

async function checkDatabaseConnection() {
  try {
    await db.execute(sql`SELECT 1`);
    log("Database connection established successfully");
  } catch (error: any) {
    log(`Database connection error: ${error.message}`);
    throw error;
  }
}

async function cleanupPort() {
  try {
    await execAsync(`lsof -ti:${PORT} | xargs kill -9`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error) {
    log(`No existing process found on port ${PORT}`);
  }
}

async function setupMiddleware(app: express.Application) {
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());

  // Add health check endpoint first
  app.get("/api/health", (_req, res) => {
    res.set('Cache-Control', 'no-store').json({ 
      status: "healthy",
      timestamp: new Date().toISOString(),
      port: PORT
    });
  });
}

async function startServer() {
  try {
    log("Starting server initialization...");
    await checkDatabaseConnection();
    await cleanupPort();

    const app = express();
    app.set('trust proxy', 1);

    await setupMiddleware(app);
    const server = createServer(app);
    registerRoutes(app);
    await initializeAdmin().catch(console.error);

    if (!process.env.TELEGRAM_BOT_TOKEN) {
      throw new Error("TELEGRAM_BOT_TOKEN must be provided");
    }
    log("Initializing Telegram bot...");

    // Configure server based on environment
    if (process.env.NODE_ENV === "development") {
      log("Starting development server with Vite...");
      await setupVite(app, server);
      log("Development server configured with Vite");
    } else {
      log("Starting production server...");
      await serveStatic(app);
      log("Production static file serving configured");
    }

    // Start the server and return a promise that resolves when the server is ready
    return new Promise((resolve) => {
      const serverInstance = server.listen(PORT, "0.0.0.0", () => {
        log(`Server running on port ${PORT}`);
        log("Telegram bot started successfully");

        // Add an explicit ready check
        const healthCheck = async () => {
          try {
            const response = await fetch(`http://localhost:${PORT}/api/health`);
            if (response.ok) {
              const data = await response.json();
              log(`Server health check passed: ${JSON.stringify(data)}`);
              resolve(serverInstance);
            } else {
              setTimeout(healthCheck, 1000);
            }
          } catch (error) {
            log(`Health check failed, retrying: ${error}`);
            setTimeout(healthCheck, 1000);
          }
        };

        healthCheck();
      });

      serverInstance.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          log(`Port ${PORT} is already in use`);
          process.exit(1);
        } else {
          log(`Server error: ${error.message}`);
          throw error;
        }
      });
    });
  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
}

// Graceful shutdown handling
process.on("SIGTERM", async () => {
  log("Received SIGTERM signal. Shutting down gracefully...");
  if (bot) await bot.stopPolling();
  process.exit(0);
});

process.on("SIGINT", async () => {
  log("Received SIGINT signal. Shutting down gracefully...");
  if (bot) await bot.stopPolling();
  process.exit(0);
});

// Export the startServer function for use in workflow configuration
export { startServer };

// Only start the server if this is the main module
if (import.meta.url === import.meta.resolve('./index.ts')) {
  startServer().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}