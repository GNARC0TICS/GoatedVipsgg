/**
 * Main server entry point for the GoatedVIPs application
 */
import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { WebSocket } from "ws";
import { log } from "./utils/logger";
import { initializeBot } from "./telegram/bot";
import { registerRoutes, setupWebSocket } from "./routes";
import { initializeAdmin } from "./middleware/admin";
import { db } from "../db";
import cors from "cors";
import session from "express-session";
import connectPg from "connect-pg-simple";
import authRouter from './routes/auth';

// Core dependencies
//import express from "express";
//import cookieParser from "cookie-parser";
//import { createServer } from "http";
//import { WebSocket, WebSocketServer } from "ws";
//import fs from "fs";
//import path from "path";
//import { fileURLToPath } from "url";
//import { createServer as createViteServer, createLogger } from "vite";
//import { promisify } from "util";
//import { exec } from "child_process";
//import { sql } from "drizzle-orm";
//import { log } from "./utils/logger";
//import { initializeBot } from "./telegram/bot";
//import { registerRoutes } from "./routes";
//import { initializeAdmin } from "./middleware/admin";
//import { db } from "../db";
//import cors from "cors";
//import session from "express-session";
//import connectPg from "connect-pg-simple";
//import authRouter from './routes/auth';

// Convert callback-based exec to Promise-based for cleaner async/await usage
const execAsync = promisify(exec);

// Server configuration constants
const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = '0.0.0.0';
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

/**
 * Checks if a specified port is available for use
 * Used during server initialization to ensure clean startup
 * 
 * @param port - The port number to check
 * @returns Promise<boolean> - True if port is available, false otherwise
 */
async function isPortAvailable(port: number): Promise<boolean> {
  try {
    await execAsync(`lsof -i:${port}`);
    // Port is in use
    return false;
  } catch {
    // No process is using the port
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

  // Initial port check
  log("info", `Checking availability of port ${port}...`);

  while (Date.now() - start < timeout) {
    if (await isPortAvailable(port)) {
      log("info", `Port ${port} is available`);
      return;
    }
    log("info", `Port ${port} is in use, waiting...`);
    await forceKillPort(port);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error(`Timeout waiting for port ${port} to become available`);
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
 */
async function initializeServer() {
  try {
    log("info", "Starting server initialization...");

    // Wait for port availability
    await waitForPort(PORT);
    log("info", `Port ${PORT} is ready for use`);

    await testDbConnection();
    log("info", "Database connection established");

    const app = express();
    setupMiddleware(app);

    // Register auth routes first
    app.use('/api/auth', authRouter);

    // Create HTTP server
    const httpServer = createServer(app);

    // Setup WebSocket after HTTP server is created but before Vite
    setupWebSocket(httpServer);

    // Register other routes
    registerRoutes(app);

    // Initialize admin after routes
    await initializeAdmin().catch(error => {
      log("error", `Admin initialization error: ${error instanceof Error ? error.message : String(error)}`);
    });

    // Initialize Telegram bot integration
    log("info", "Initializing Telegram bot...");
    bot = await initializeBot();
    if (!bot) {
      log("error", "Failed to initialize Telegram bot - continuing without bot functionality");
    } else {
      log("info", "Telegram bot initialized successfully");
    }

    // Setup development or production server based on environment
    if (app.get("env") === "development") {
      await setupVite(app, httpServer);
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

    // Start server and handle graceful shutdown
    return new Promise((resolve, reject) => {
      httpServer.listen(PORT, HOST, () => {
        console.log(`PORT_READY=${PORT}`);
        log("info", `Server is running at http://${HOST}:${PORT}`);
        resolve(httpServer);
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
  wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request: any, socket: any, head: any) => {
    const url = new URL(request.url!, `http://${request.headers.host}`);

    // Skip Vite HMR connections
    if (request.headers['sec-websocket-protocol']?.includes('vite-hmr')) {
      log("info", "Skipping Vite HMR WebSocket connection");
      return;
    }

    log("info", `WebSocket upgrade request for path: ${url.pathname}`);

    // Only handle /ws/leaderboard connections
    if (url.pathname === "/ws/leaderboard") {
      if (!wss) {
        log("error", "WebSocket server not initialized");
        socket.destroy();
        return;
      }
      wss.handleUpgrade(request, socket, head, (ws) => {
        log("info", `New WebSocket connection established for ${url.pathname}`);
        wss.emit("connection", ws, request);
      });
    } else {
      log("info", `Rejected WebSocket connection to invalid path: ${url.pathname}`);
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket, req: any) => {
    // Skip Vite HMR connections to avoid interference
    if (req.headers['sec-websocket-protocol']?.includes('vite-hmr')) {
      return;
    }

    log("info", "New WebSocket connection established");

    ws.on('error', (error) => {
      log("error", `WebSocket error: ${error.message}`);
    });

    // Send initial connection confirmation
    ws.send(JSON.stringify({ type: 'connection', status: 'connected' }));
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
      : process.env.ALLOWED_ORIGINS?.split(',') || [],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
  }));

  // Cookie parser for JWT tokens
  app.use(cookieParser(process.env.COOKIE_SECRET || 'your-secret-key'));

  // Session store configuration using PostgreSQL
  const PostgresSessionStore = connectPg(session);
  app.use(session({
    store: new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  }));

  // Security headers middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  // Body parsing middleware
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(requestLogger);
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
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { promisify } from "util";
import { exec } from "child_process";
import { sql } from "drizzle-orm";
import { WebSocketServer } from "ws";


initializeServer().catch((error) => {
  log("error", `Server startup error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});