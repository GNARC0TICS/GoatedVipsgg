/**
 * Main server entry point for the GoatedVIPs application
 * Handles server initialization, middleware setup, and core service bootstrapping
 */

// Import order optimized to avoid circular dependencies
import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { WebSocket, WebSocketServer } from "ws";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { promisify } from "util";
import { exec } from "child_process";
import { sql } from "drizzle-orm";
import cors from "cors";
import fetch from "node-fetch";

// Local imports
import { logAction as log } from "./utils/logger";
import { initializeBot } from "./telegram/bot";
import { registerRoutes } from "./routes";
import { initializeAdmin } from "./middleware/admin";
import { db } from "@db";
import { setupAuth } from "./auth";

// Convert callback-based exec to Promise-based
const execAsync = promisify(exec);

// Server configuration constants
const API_PORT = parseInt(process.env.API_PORT || '5000', 10);
const HOST = '0.0.0.0';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MAX_PORT_RETRIES = 10;
const SERVER_STARTUP_TIMEOUT = 30000; // 30 seconds

// Global server state management
let templateCache: string | null = null;
let server: any = null;
let bot: any = null;
let wss: WebSocketServer | null = null;

/**
 * Checks if a specified port is available for use
 */
async function isPortAvailable(port: number): Promise<boolean> {
  try {
    await execAsync(`lsof -i:${port}`);
    return false;
  } catch {
    return true;
  }
}

/**
 * Waits for server to be ready on the specified port
 */
async function waitForServer(port: number): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < SERVER_STARTUP_TIMEOUT) {
    try {
      const response = await fetch(`http://${HOST}:${port}/health`);
      if (response.ok) {
        const data = await response.json();
        log("info", `Server is ready on port ${port} at ${data.timestamp}`);
        return;
      }
    } catch (error) {
      // Wait 1 second before next attempt
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  throw new Error(`Server failed to start within ${SERVER_STARTUP_TIMEOUT}ms`);
}

/**
 * Finds an available port starting from the specified port
 */
async function findAvailablePort(startPort: number): Promise<number> {
  let port = startPort;
  while (!await isPortAvailable(port)) {
    port++;
    if (port > startPort + MAX_PORT_RETRIES) {
      throw new Error(`Unable to find an available port after trying ${startPort} through ${port-1}`);
    }
  }
  return port;
}

/**
 * Main server initialization function
 */
async function initializeServer() {
  try {
    log("info", "Starting server initialization...");

    // Find an available port
    const port = await findAvailablePort(API_PORT);
    log("info", `Selected port ${port}, proceeding with initialization`);

    // Test database connection
    try {
      await db.execute(sql`SELECT 1`);
      log("info", "Database connection established");
    } catch (error) {
      log("error", `Database connection error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }

    const app = express();

    // Basic health check endpoint (must be first)
    app.get('/health', (_req, res) => {
      res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // Setup middleware and routes
    setupMiddleware(app);
    setupAuth(app); // Initialize authentication
    registerRoutes(app);

    // Initialize admin after routes
    await initializeAdmin().catch(error => {
      log("error", `Admin initialization error: ${error instanceof Error ? error.message : String(error)}`);
    });

    // Create HTTP server and WebSocket server
    server = createServer(app);
    setupWebSocket(server);

    // Initialize Telegram bot with error handling
    try {
      log("info", "Initializing Telegram bot...");
      bot = await initializeBot(app);
      if (!bot) {
        log("warn", "Telegram bot initialization skipped - continuing without bot functionality");
      } else {
        log("info", "Telegram bot initialized successfully");
      }
    } catch (error) {
      log("error", `Telegram bot initialization error: ${error instanceof Error ? error.message : String(error)}`);
      // Continue without bot functionality
    }

    // Setup development or production server
    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start server with proper error handling and port waiting
    return new Promise((resolve, reject) => {
      const serverInstance = server.listen(port, HOST, async () => {
        log("info", `Server is attempting to start on http://${HOST}:${port}`);
        try {
          await waitForServer(port);
          resolve(serverInstance);
        } catch (error) {
          reject(error);
        }
      });

      serverInstance.on("error", (err: Error) => {
        log("error", `Server failed to start: ${err.message}`);
        reject(err);
      });

      // Graceful shutdown handler
      const shutdown = async (signal: string) => {
        log("info", `Received ${signal}, shutting down gracefully...`);

        if (bot) {
          try {
            if (process.env.NODE_ENV !== 'production') {
              await bot.stopPolling();
            }
            log("info", "Telegram bot stopped");
          } catch (error) {
            log("error", "Error stopping Telegram bot");
          }
        }

        if (wss) {
          wss.close(() => {
            log("info", "WebSocket server closed");
          });
        }

        serverInstance.close(() => {
          log("info", "HTTP server closed");
          process.exit(0);
        });

        // Force exit if graceful shutdown fails
        setTimeout(() => {
          log("error", "Forced shutdown after timeout");
          process.exit(1);
        }, 10000);
      };

      // Register shutdown handlers
      process.on("SIGTERM", () => shutdown("SIGTERM"));
      process.on("SIGINT", () => shutdown("SIGINT"));
    });
  } catch (error) {
    log("error", `Failed to start application: ${error instanceof Error ? error.message : String(error)}`);
    throw error; // Let the caller handle the error
  }
}

/**
 * Sets up WebSocket server for real-time communication
 */
function setupWebSocket(server: any) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req: any) => {
    // Skip Vite HMR connections
    if (req.headers['sec-websocket-protocol']?.includes('vite-hmr')) {
      return;
    }

    log("info", "New WebSocket connection established");

    ws.on('error', (error) => {
      log("error", `WebSocket error: ${error.message}`);
    });
  });

  return wss;
}

/**
 * Configures Express middleware stack
 * Sets up core middleware for request handling, security, and session management
 * 
 * @param app - Express application instance
 */
function setupMiddleware(app: express.Application) {
  app.set('trust proxy', 1);

  // CORS configuration for API routes
  app.use('/api', cors({
    origin: process.env.NODE_ENV === 'development'
      ? [`http://${HOST}:${API_PORT}`]
      : process.env.ALLOWED_ORIGINS?.split(',') || [],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
  }));

  // Body parsing middleware
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());
  app.use(requestLogger);

  // Security headers middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
  });
}

// Request logger (unchanged)
const requestLogger = (() => {
  const logQueue: string[] = [];
  let flushTimeout: NodeJS.Timeout | null = null;

  const flushLogs = () => {
    if (logQueue.length > 0) {
      console.log(logQueue.join('\n'));
      logQueue.length = 0;
    }
    flushTimeout = null;
  };

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const start = Date.now();
    res.on("finish", () => {
      if (req.path.startsWith("/api")) {
        const duration = Date.now() - start;
        logQueue.push(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
        if (!flushTimeout) {
          flushTimeout = setTimeout(flushLogs, 1000);
        }
      }
    });
    next();
  };
})();


// serveStatic function (unchanged)
function serveStatic(app: express.Application) {
  const distPath = path.resolve(__dirname, "..", "dist", "public");
  if (!fs.existsSync(distPath)) {
    // Create the directory if it doesn't exist in development
    if (process.env.NODE_ENV === "development") {
      fs.mkdirSync(distPath, { recursive: true });
    } else {
      throw new Error(`Could not find the build directory: ${distPath}. Please build the client first.`);
    }
  }

  // Static file serving with caching
  app.use(express.static(distPath, {
    maxAge: '1d',
    etag: true,
    lastModified: true
  }));

  // SPA fallback
  app.get("*", (_req, res, next) => {
    if (_req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.resolve(distPath, "index.html"), {
      headers: {
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  });
}

// Vite development server configuration (unchanged)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const viteConfig = defineConfig({
  plugins: [react(), runtimeErrorOverlay(), themePlugin()],
  resolve: {
    alias: {
      "@db": path.resolve(__dirname, "../db"),
      "@": path.resolve(__dirname, "../client/src"),
    },
  },
  root: path.resolve(__dirname, "../client"),
  build: {
    outDir: path.resolve(__dirname, "../dist/public"),
    emptyOutDir: true,
  },
});

/**
 * Sets up Vite development server
 * Configures Vite for development mode with HMR
 * 
 * @param app - Express application instance
 * @param server - HTTP server instance
 */
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

  // Template loading with caching
  const loadTemplate = async () => {
    if (!templateCache) {
      const clientTemplate = path.resolve(__dirname, "..", "client", "index.html");
      templateCache = await fs.promises.readFile(clientTemplate, "utf-8");
    }
    return templateCache;
  };

  // Serve Vite-processed HTML
  app.use("*", async (req, res, next) => {
    try {
      let template = await loadTemplate();
      template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${Date.now()}"`);
      const page = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({
        "Content-Type": "text/html",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff"
      }).end(page);
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      next(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

// Initialize server
initializeServer().catch((error) => {
  log("error", `Server startup error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});