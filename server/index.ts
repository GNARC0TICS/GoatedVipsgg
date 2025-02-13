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

// Server state flags
let isServerReady = false;

async function isPortAvailable(port: number): Promise<boolean> {
  try {
    const server = createServer();
    await new Promise((resolve, reject) => {
      server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`Port ${port} is already in use`));
        } else {
          reject(err);
        }
      });
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      server.listen(port, '0.0.0.0');
    });
    return true;
  } catch (err) {
    return false;
  }
}

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
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

async function checkDatabaseConnection() {
  try {
    await db.execute(sql`SELECT 1`);
    log("Database connection established successfully");
    return true;
  } catch (error: any) {
    log(`Database connection error: ${error.message}`);
    return false;
  }
}

async function cleanupPort() {
  try {
    const portAvailable = await isPortAvailable(PORT);
    if (!portAvailable) {
      await execAsync(`lsof -ti:${PORT} | xargs kill -9`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      log(`Cleaned up port ${PORT}`);
    }
    return true;
  } catch (error) {
    log(`No existing process found on port ${PORT}`);
    return true;
  }
}

async function setupMiddleware(app: express.Application) {
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());

  // Enhanced health check endpoint
  app.get("/api/health", (_req, res) => {
    res.set('Cache-Control', 'no-store').json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      port: PORT,
      env: process.env.NODE_ENV || 'development',
      uptime: process.uptime()
    });
  });
}

async function startServer() {
  try {
    log("Starting server initialization...");
    isServerReady = false;

    // Check port availability first
    const portAvailable = await isPortAvailable(PORT);
    if (!portAvailable) {
      log(`Port ${PORT} is not available, attempting cleanup...`);
      await cleanupPort();
    }

    // Check database connection
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      throw new Error("Failed to connect to database");
    }

    const app = express();
    app.set('trust proxy', 1);

    await setupMiddleware(app);
    const server = createServer(app);
    registerRoutes(app);
    await initializeAdmin().catch(console.error);

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

    // Start the server with enhanced error handling and health checks
    return new Promise((resolve, reject) => {
      const serverInstance = server.listen(PORT, "0.0.0.0", async () => {
        log(`Server running on port ${PORT}`);

        // Verify server is actually listening
        const healthCheck = async (retries = 3) => {
          try {
            const response = await fetch(`http://localhost:${PORT}/api/health`);
            if (response.ok) {
              const data = await response.json();
              log(`Server health check passed: ${JSON.stringify(data)}`);
              isServerReady = true;
              process.env.SERVER_READY = 'true';
              resolve(serverInstance);
            } else if (retries > 0) {
              log(`Health check failed, retrying... (${retries} attempts left)`);
              setTimeout(() => healthCheck(retries - 1), 1000);
            } else {
              reject(new Error("Server health check failed after multiple attempts"));
            }
          } catch (error) {
            if (retries > 0) {
              log(`Health check error, retrying... (${retries} attempts left): ${error}`);
              setTimeout(() => healthCheck(retries - 1), 1000);
            } else {
              reject(error);
            }
          }
        };

        await healthCheck();
      });

      serverInstance.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          log(`Port ${PORT} is already in use`);
          reject(error);
        } else {
          log(`Server error: ${error.message}`);
          reject(error);
        }
      });

      // Add timeout to prevent hanging
      setTimeout(() => {
        if (!isServerReady) {
          reject(new Error("Server startup timed out"));
        }
      }, 30000);
    });
  } catch (error) {
    console.error("Failed to start application:", error);
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