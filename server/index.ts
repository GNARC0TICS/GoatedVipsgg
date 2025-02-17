/**
 * Main server entry point for the GoatedVIPs application
 * Handles server initialization, middleware setup, and core service bootstrapping
 */

import express from "express";
import { createServer, Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { log } from "./utils/logger";
import { registerRoutes as setupAPIRoutes } from "./routes";
import { setupAuth } from "./auth";
import cors from "cors";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db } from "@db";
import { sql } from "drizzle-orm";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import cookieParser from "cookie-parser";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { createLogger, createViteServer } from "vite";


// Type declarations
declare module 'express-session' {
  interface SessionData {
    initialized: boolean;
    isAnonymous: boolean;
    userId?: number;
    telegramId?: string;
  }
}

declare module 'ws' {
  interface WebSocket {
    isAlive: boolean;
  }
}

// Add these declarations at the top of the file, after the imports
declare global {
  namespace Express {
    interface Request {
      session: SessionData;
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Port configuration
const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = '0.0.0.0';

async function waitForPort(port: number, timeout = 30000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const server = createServer();
      await new Promise<void>((resolve, reject) => {
        server.once('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            reject(new Error(`Port ${port} is in use`));
          } else {
            reject(err);
          }
        });

        server.listen(port, HOST, () => {
          server.close(() => resolve());
        });
      });

      log("info", `Port ${port} is available`);
      return;
    } catch (error) {
      log("info", `Waiting for port ${port} to become available...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`Timeout waiting for port ${port}`);
}

async function testDbConnection() {
  try {
    await db.execute(sql`SELECT 1`);
    log("info", "Database connection successful");
  } catch (error) {
    log("error", "Database connection failed:", { error });
    process.exit(1);
  }
}

// Update the server initialization part to be more explicit about port readiness
async function initializeServer() {
  try {
    log("info", "Starting server initialization...");

    // Ensure port is available
    await waitForPort(PORT);
    log("info", `Port ${PORT} available, proceeding with initialization`);

    // Test database connection
    await testDbConnection();

    const app = express();

    // CORS setup
    app.use('/api', cors({
      origin: process.env.NODE_ENV === 'development'
        ? ['http://localhost:5000', 'http://0.0.0.0:5000']
        : process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
    }));

    // Session store setup
    const PostgresSessionStore = connectPg(session);
    app.use(session({
      store: new PostgresSessionStore({
        conObject: {
          connectionString: process.env.DATABASE_URL,
        },
        createTableIfMissing: true,
        pruneSessionInterval: 60
      }),
      secret: process.env.SESSION_SECRET || 'development-secret',
      resave: false,
      saveUninitialized: true,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000
      }
    }));

    // Auth setup
    setupAuth(app);

    // Create HTTP server
    const server = createServer(app);

    // Setup WebSocket server
    const wss = new WebSocketServer({ server, path: '/ws' });
    setupWebSocketHandlers(wss);

    // Setup API routes
    setupAPIRoutes(app);

    // Error handling
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      log("error", "Server error:", { error: err });
      res.status(500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
      });
    });

    // Start server with explicit port readiness signaling
    return new Promise<Server>((resolve, reject) => {
      server.listen(PORT, HOST, () => {
        log("info", `Server is running at http://${HOST}:${PORT}`);
        // Signal port readiness to Replit
        console.log(`PORT=${PORT}`);
        console.log(`PORT_READY=${PORT}`);
        resolve(server);
      }).on('error', (err: Error) => {
        log("error", `Failed to start server: ${err.message}`);
        reject(err);
      });
    });
  } catch (error) {
    log("error", `Server initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Separate WebSocket setup for better organization
function setupWebSocketHandlers(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket) => {
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('error', (error) => {
      log("error", `WebSocket error: ${error.message}`);
      ws.terminate();
    });

    ws.on('close', () => {
      log("info", "WebSocket connection closed");
    });

    // Send initial connection confirmation
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'CONNECTION_ESTABLISHED',
        timestamp: Date.now()
      }));
    }
  });

  // Heartbeat interval for WebSocket connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  return wss;
}

// Initialize server
initializeServer().then((server) => {
  log("info", "Server initialization completed successfully");
}).catch((error) => {
  log("error", `Server startup error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

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

// Global server state management
let templateCache: string | null = null;  // Caches HTML template for better performance
let server: any = null;                   // HTTP server instance
let bot: any = null;                      // Telegram bot instance
let wss: WebSocketServer | null = null;   // WebSocket server instance


const execAsync = promisify(exec);

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