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

declare global {
  namespace Express {
    interface Request {
      session: SessionData;
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Port configuration - ensure consistency
const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = '0.0.0.0';

async function waitForPort(port: number, timeout = 30000): Promise<void> {
  const start = Date.now();
  log("info", `Waiting for port ${port} to become available...`);

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
      log("info", `Port ${port} is still busy, waiting for it to become available...`);
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
    throw error;
  }
}

async function initializeServer() {
  try {
    log("info", `Starting server initialization on port ${PORT}...`);

    // Force kill any existing process on our port
    await forceKillPort(PORT);
    log("info", "Cleared port for use");

    // Ensure port is available
    await waitForPort(PORT);
    log("info", `Port ${PORT} available, proceeding with initialization`);

    // Test database connection
    await testDbConnection();
    log("info", "Database connection verified");

    const app = express();
    setupMiddleware(app);
    log("info", "Middleware configured");

    // Create HTTP server
    const server = createServer(app);
    log("info", "HTTP server created");

    // Setup WebSocket server
    const wss = new WebSocketServer({ server });
    setupWebSocketHandlers(wss);
    log("info", "WebSocket server initialized");

    // Setup API routes
    setupAPIRoutes(app);
    log("info", "API routes registered");

    // Start server with explicit port readiness signaling
    return new Promise<Server>((resolve, reject) => {
      server.listen(PORT, HOST, () => {
        log("info", `Server is running at http://${HOST}:${PORT}`);

        // Signal port readiness to Replit - make this very explicit
        process.stdout.write(`PORT=${PORT}\n`);
        process.stdout.write(`PORT_READY=${PORT}\n`);

        resolve(server);
      }).on('error', (err: Error) => {
        log("error", `Failed to start server: ${err.message}`);
        reject(err);
      });
    });
  } catch (error) {
    log("error", `Server initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

const execAsync = promisify(exec);

async function forceKillPort(port: number): Promise<void> {
  try {
    log("info", `Attempting to kill any process using port ${port}`);
    await execAsync(`lsof -ti:${port} | xargs kill -9`);
    log("info", `Successfully killed process on port ${port}`);
  } catch (error) {
    // If no process is using the port, the command will fail silently
    log("info", `No process found using port ${port}`);
  }
}

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

function setupMiddleware(app: express.Application) {
  app.set('trust proxy', 1);

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
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    }
  }));

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      log("info", `${req.method} ${req.path} request received`);
    }
    next();
  });
}

// Initialize server with proper error handling
initializeServer()
  .then((server) => {
    log("info", "Server initialization completed successfully");
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      log("info", "Received SIGTERM signal. Shutting down gracefully...");
      server.close(() => {
        log("info", "Server closed successfully");
        process.exit(0);
      });
    });
  })
  .catch((error) => {
    log("error", `Server startup error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });