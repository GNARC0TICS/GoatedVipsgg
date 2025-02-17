/**
 * Main server entry point for the GoatedVIPs application
 * Handles server initialization, middleware setup, and core service bootstrapping
 * 
 * Core responsibilities:
 * - Server configuration and startup
 * - Middleware integration
 * - Database connection
 * - WebSocket setup
 * - Telegram bot initialization
 * - Route registration
 * - Error handling
 * 
 * @module server/index
 */

// Add type declarations at the top of the file
declare module 'express-session' {
  interface SessionData {
    initialized: boolean;
    isAnonymous: boolean;
  }
}

// Core dependencies
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
import { log } from "./utils/logger";
import botUtils from "./telegram/bot";
import { registerRoutes as setupAPIRoutes } from "./routes"; // Renamed for clarity
import { initializeAdmin } from "./middleware/admin";
import { db } from "../db";
import { setupAuth } from "./auth";
import cors from "cors";
import session from "express-session";
import connectPg from "connect-pg-simple";

// Convert callback-based exec to Promise-based for cleaner async/await usage
const execAsync = promisify(exec);

// Server configuration constants
const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = '0.0.0.0';
// Removed separate BOT_PORT as we're consolidating to single port
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global server state management
let templateCache: string | null = null;  // Caches HTML template for better performance
let server: any = null;                   // HTTP server instance
let bot: any = null;                      // Telegram bot instance
let wss: WebSocketServer | null = null;   // WebSocket server instance

/**
 * Checks if a specified port is available for use
 * Used during server initialization to ensure clean startup
 * 
 * @param port - The port number to check
 * @returns Promise<boolean> - True if port is available, false otherwise
 */
async function forceKillPort(port: number): Promise<void> {
  try {
    await execAsync(`lsof -ti:${port} | xargs kill -9`);
  } catch {
    // If no process is using the port, the command will fail silently
  }
}

async function isPortAvailable(port: number): Promise<boolean> {
  try {
    await execAsync(`lsof -i:${port}`);
    // Port is in use, attempt to force kill
    await forceKillPort(port);
    // Wait a moment for the port to be released
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  } catch {
    return true;
  }
}

/**
 * Waits for a port to become available with timeout
 * Ensures clean server startup by waiting for port availability
 * 
 * @param port - Port number to wait for
 * @param timeout - Maximum time to wait in milliseconds
 * @throws Error if timeout is reached before port becomes available
 */
async function waitForPort(port: number, timeout = 30000): Promise<void> {
  const start = Date.now();
  
  // Initial cleanup attempt
  await forceKillPort(port);
  
  while (Date.now() - start < timeout) {
    const isAvailable = await isPortAvailable(port);
    if (isAvailable) {
      log("info", `Port ${port} is now available`);
      return;
    }
    log("info", `Port ${port} is in use, attempting cleanup...`);
    await forceKillPort(port);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(`Timeout waiting for port ${port}`);
}

/**
 * Tests database connectivity
 * Critical startup check to ensure database is accessible
 * Exits process if connection fails
 */
async function testDbConnection() {
  try {
    await db.execute(sql`SELECT 1`);
    console.log("Database connection successful");
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}

/**
 * Main server initialization function
 * Orchestrates the complete server setup process including:
 * - Port availability check
 * - Database connection
 * - Express app setup
 * - Middleware configuration
 * - Route registration
 * - Admin initialization
 * - WebSocket setup
 * - Telegram bot initialization
 */
async function initializeServer() {
  try {
    log("info", "Starting server initialization...");

    await waitForPort(PORT);
    log("info", "Port available, proceeding with initialization");

    await testDbConnection();
    log("info", "Database connection established");

    const app = express();

    // Setup middleware first
    setupMiddleware(app);
    setupAuth(app);

    // Create HTTP server
    server = createServer(app);

    // Setup WebSocket
    setupWebSocket(server);

    // Initialize Telegram bot integration
    log("info", "Initializing Telegram bot...");
    const bot = await botUtils.initializeBot();
    if (!bot) {
      log("error", "Failed to initialize Telegram bot - continuing without bot functionality");
    } else {
      log("info", "Telegram bot initialized successfully");
    }

    // Setup API routes before any static file handling
    setupAPIRoutes(app);

    // Setup development or production server
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Global error handler
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error("Server error:", err);
      res.status(500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
      });
    });

    // Start server
    return new Promise((resolve, reject) => {
      server.listen(PORT, HOST, () => {
        log("info", `Server is ready at http://0.0.0.0:${PORT}`);
        console.log(`PORT=${PORT}`);
        console.log(`PORT_READY=${PORT}`);
        resolve(server);
      }).on("error", (err: Error) => {
        log("error", `Server failed to start: ${err.message}`);
        reject(err);
      });
    });
  } catch (error) {
    log("error", `Failed to start application: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * Sets up WebSocket server for real-time communication
 * Handles client connections and message routing
 * 
 * @param server - HTTP server instance to attach WebSocket server to
 */
function setupWebSocket(server: any) {
  wss = new WebSocketServer({ server, path: '/ws' });

  const HEARTBEAT_INTERVAL = 30000;
  const CLIENT_TIMEOUT = 35000;

  wss.on('connection', (ws: WebSocket, req: any) => {
    if (req.headers['sec-websocket-protocol']?.includes('vite-hmr')) {
      return;
    }

    ws.isAlive = true;
    log("info", "New WebSocket connection established");

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('error', (error) => {
      log("error", `WebSocket error: ${error.message}`);
      ws.terminate();
    });

    ws.on('close', () => {
      log("info", "WebSocket connection closed");
      ws.isAlive = false;
    });

    // Send initial connection confirmation
    ws.send(JSON.stringify({
      type: 'CONNECTION_ESTABLISHED',
      timestamp: Date.now()
    }));
  });

  // Heartbeat to check for stale connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL);

  wss.on('close', () => {
    clearInterval(interval);
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
      ? ['http://localhost:5000', 'http://0.0.0.0:5000']
      : process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Telegram-Bot-Api-Secret-Token']
  }));

  // Session store configuration using PostgreSQL
  const PostgresSessionStore = connectPg(session);
  app.use(session({
    store: new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true,
      pruneSessionInterval: 60
    }),
    name: 'sid',
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    },
  }));

  // Add session initialization middleware for anonymous access
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session.initialized) {
      req.session.initialized = true;
      req.session.isAnonymous = true;
    }
    next();
  });

  // Body parsing middleware
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());

  // Logging middleware
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      log("info", `${req.method} ${req.path} request received`);
    }
    next();
  });
}

/**
 * Request logging middleware with batched logging
 * Improves performance by batching log writes
 */
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

/**
 * Serves static files in production mode
 * Handles static asset serving and SPA fallback
 * 
 * @param app - Express application instance
 */
function serveStatic(app: express.Application) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(`Could not find the build directory: ${distPath}. Please build the client first.`);
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

// Vite development server configuration
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