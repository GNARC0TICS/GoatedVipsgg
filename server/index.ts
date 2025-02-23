/**
 * Main server entry point for the GoatedVIPs application
 * Handles server initialization, middleware setup, and core service bootstrapping
 */

import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { promisify } from "util";
import { exec } from "child_process";
import { sql } from "drizzle-orm";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { db } from "@db";

// Local imports
import { logAction } from "./telegram/utils/logger";
import { initializeBot } from "./telegram/bot";
import { initializeAdmin } from "./middleware/admin";

// Convert callback-based exec to Promise-based
const execAsync = promisify(exec);

// Server configuration constants
const API_PORT = parseInt(process.env.API_PORT || '5000', 10);
const WS_PATH = '/ws/leaderboard';
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
        logAction({
          action: "Server ready",
          success: true,
          details: `Port ${port} at ${data.timestamp}`
        });
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
 * Sets up WebSocket server for real-time communication
 */
function setupWebSocket(server: any) {
  wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request: any, socket: any, head: any) => {
    if (request.url === WS_PATH) {
      if (!wss) return;

      wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
        if (!wss) return;
        wss.emit('connection', ws, request);

        const customWs = ws as WebSocket & { isAlive: boolean };
        customWs.isAlive = true;

        const pingInterval = setInterval(() => {
          if (customWs.isAlive === false) {
            customWs.terminate();
            return;
          }
          customWs.isAlive = false;
          customWs.ping();
        }, 30000);

        customWs.on('pong', () => {
          customWs.isAlive = true;
        });

        customWs.on('error', (error) => {
          logAction({
            action: "WebSocket error",
            success: false,
            details: error.message
          });
        });

        customWs.on('close', () => {
          clearInterval(pingInterval);
        });
      });
    }
  });

  return wss;
}

/**
 * Main server initialization function
 */
async function initializeServer() {
  const app = express();

  // Basic health check endpoint (must be first)
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Setup core middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Configure CORS for API routes
  app.use('/api', cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Basic security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Test database connection
  try {
    await db.execute(sql`SELECT 1`);
    console.log('Database connection successful');
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }

  // Create HTTP server
  const httpServer = createServer(app);

  // Setup auth and routes
  setupAuth(app);
  registerRoutes(app);

  // Setup WebSocket
  setupWebSocket(httpServer);

  // Error handling middleware
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[Error] ${err.stack}`);
    res.status(500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
    });
  });

  // Start server
  return new Promise((resolve, reject) => {
    httpServer.listen(API_PORT, HOST, async () => {
      console.log(`Server running at http://${HOST}:${API_PORT}`);
      try {
        await waitForServer(API_PORT);
        resolve(httpServer);
      } catch (error) {
        reject(error);
      }
    });

    httpServer.on('error', (error: Error) => {
      console.error('Server failed to start:', error);
      reject(error);
    });

    // Graceful shutdown handler
    const shutdown = async () => {
      console.log('Shutting down server...');
      if (wss) {
        wss.close(() => {
          console.log('WebSocket server closed');
        });
      }
      httpServer.close(() => {
        console.log('Server stopped');
        process.exit(0);
      });

      // Force exit if graceful shutdown fails
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  });
}

// Initialize server and setup development environment
const startServer = async () => {
  try {
    const httpServer = await initializeServer();

    // Setup admin after server is running
    await initializeAdmin().catch(error => {
      logAction({
        action: "Admin initialization",
        success: false,
        details: error instanceof Error ? error.message : String(error)
      });
    });

    if (process.env.NODE_ENV === "development") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "custom"
      });

      const app = express();
      app.use(vite.middlewares);
      const viteServer = createServer(app);
      viteServer.listen(API_PORT, HOST, () => {
        console.log(`Vite dev server running on port ${API_PORT}`);
      });

    }

  } catch (error) {
    logAction({
      action: "Server startup",
      success: false,
      details: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
};

startServer();