import express from "express";
import testEmailRouter from './routes/test-email';
import fallbackApiRouter from "./routes/fallback-api";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db, pgPool, initDatabase } from "../db/connection";
import { promisify } from "util";
import { exec } from "child_process";
import { createServer } from "http";
import { initializeAdmin } from "./middleware/admin";
// Telegram bot has been moved to a standalone service
// See telegrambotcreationguide.md for details
import {
  apiRateLimiter,
  affiliateRateLimiter,
  raceRateLimiter,
} from "./middleware/rate-limiter";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import fetch from "node-fetch";
import helmet from "helmet";
import nodemailer from 'nodemailer';

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || process.env.API_PORT || 5000;
const ADMIN_PORT = process.env.ADMIN_PORT || 5001;
app.set('port', PORT);

// Define allowed admin domains
const ADMIN_DOMAINS = (process.env.ADMIN_DOMAINS || 'admin.goatedvips.replit.app,goombas.net').split(',').map(domain => domain.trim());

async function setupMiddleware() {
  // Domain-based routing middleware with improved logging
  app.use((req, res, next) => {
    const host = req.hostname;
    log(`Request from hostname: ${host}, path: ${req.path}`);
    
    // Check if this is an admin domain
    const isAdminDomain = ADMIN_DOMAINS.some(domain => 
      host === domain || host.endsWith(`.${domain}`)
    );
    
    log(`Domain check: ${host} is ${isAdminDomain ? 'an admin' : 'a public'} domain`);
    
    // For admin domain, only allow admin routes
    if (isAdminDomain) {
      if (req.path.startsWith('/admin') || req.path === '/api/admin/login') {
        log(`Admin domain accessing admin route: ${req.path}`);
        return next();
      }
      // Redirect non-admin routes to admin login
      log(`Admin domain accessing non-admin route: ${req.path}, redirecting to /admin/login`);
      return res.redirect('/admin/login');
    }
    
    // For public domain, block direct access to admin routes
    if (!isAdminDomain && req.path.startsWith('/admin')) {
      log(`Public domain attempting to access admin route: ${req.path}, returning 404`);
      return res.status(404).send('Not found');
    }
    
    next();
  });

  // Security middleware
  if (process.env.NODE_ENV === 'production') {
    // Use helmet in production for security headers
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          imgSrc: ["'self'", "data:", "https://*"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          connectSrc: ["'self'", "https://*"],
        },
      },
      crossOriginEmbedderPolicy: false, // Allow embedding of resources
      crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resource sharing
    }));
  }

  // Basic middleware
  app.use(express.json());
  app.use('/api', testEmailRouter);
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  // Request logging
  app.use(requestLogger);

  // Rate limiters - apply before routes but after basic middleware
  app.use("/api", apiRateLimiter);
  app.use("/api/affiliate/stats", affiliateRateLimiter);
  app.use("/api/races", raceRateLimiter);

  // Enhanced health check endpoint with database status
  app.get("/api/health", async (_req, res) => {
    try {
      // Test connection by running a simple query
      const client = await pgPool.connect();
      await client.query('SELECT NOW()');
      client.release();

      res.json({ 
        status: "healthy",
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        services: {
          database: {
            status: "connected"
          },
          api: {
            status: "running",
            uptime: process.uptime()
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      });
    }
  });

  // Telegram bot status endpoint (placeholder)
  // The actual Telegram bot is now a standalone service
  // See telegrambotcreationguide.md for details
  app.get("/api/telegram/status", (_req, res) => {
    res.json({
      status: "ok",
      telegramBot: {
        status: "external",
        message: "Telegram bot is now a standalone service. See telegrambotcreationguide.md for details."
      },
      timestamp: new Date().toISOString(),
    });
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

// Legacy error handler - keeping for reference but using the new one from middleware
function legacyErrorHandler(
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
    const result = await initDatabase();

    if (result) {
      log("Database connection successful");
      return true;
    } else {
      log("Database connection failed");
      return false;
    }
  } catch (error) {
    console.error("Database connection error:", error);
    return false;
  }
}

async function cleanupPort(port: number | string) {
  const portNum = typeof port === 'string' ? parseInt(port, 10) : port;
  try {
    await execAsync(`lsof -ti:${portNum} | xargs kill -9`);
    // Wait for port to be released
    await new Promise((resolve) => setTimeout(resolve, 1000));
    log(`Port ${portNum} is now available`);
    return true;
  } catch (error) {
    log("No existing process found on port " + portNum);
    return true;
  }
}

async function waitForPort(port: number, retries = 5): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`http://0.0.0.0:${port}/api/health`);
      if (response.ok) {
        log(`Server is ready on port ${port}`);
        return true;
      }
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return false;
}

async function startServer() {
  try {
    log("Starting server initialization...");

    // Ensure database is ready
    if (!(await checkDatabase())) {
      throw new Error("Database connection failed");
    }

    // Ensure ports are available
    if (!(await cleanupPort(PORT as number))) {
      throw new Error("Failed to clean up main port");
    }
    
    if (process.env.NODE_ENV === 'production') {
      if (!(await cleanupPort(ADMIN_PORT as number))) {
        throw new Error("Failed to clean up admin port");
      }
    }

    // Setup middleware first
    await setupMiddleware();

    // Then register routes
    const httpServer = registerRoutes(app);
    app.use('/api', testEmailRouter); // Register test email route
    
    // Register fallback API routes
    app.use("/api", fallbackApiRouter);
    
    initializeAdmin().catch(console.error);

    // Telegram bot is now a standalone service
    // See telegrambotcreationguide.md for details

    if (app.get("env") === "development") {
      await setupVite(app, httpServer);
    } else {
      serveStatic(app);
    }

    // Add 404 handler after all routes
    app.use("*", notFoundHandler);

    // Add error handler as the last middleware
    app.use(errorHandler);

    log("All middleware and routes registered");

    // Helper function to start a server on a specific port
    async function startServerOnPort(server: any, port: number | string, serverName: string = 'Server') {
      return new Promise<void>((resolve, reject) => {
        const serverInstance = server.listen(port, "0.0.0.0");
        
        serverInstance.on("error", (err: NodeJS.ErrnoException) => {
          if (err.code === "EADDRINUSE") {
            log(`Port ${port} is in use, attempting to free it...`);
            cleanupPort(port).then(() => {
              server.listen(port, "0.0.0.0");
            });
          } else {
            reject(err);
          }
        });
        
        serverInstance.on("listening", () => {
          log(`${serverName} running on port ${port} (http://0.0.0.0:${port})`);
          resolve();
        });
      });
    }

    // Start main server
    await startServerOnPort(httpServer, PORT, "Main server");

    // Start admin server in production
    if (process.env.NODE_ENV === 'production') {
      const adminServer = createServer(app);
      await startServerOnPort(adminServer, ADMIN_PORT, "Admin server");
    }

    // Wait for server to be ready
    if (!(await waitForPort(PORT as number))) {
      throw new Error("Server failed to become ready");
    }
  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
}

// Function to close database connections
async function closeDatabaseConnections() {
  try {
    log("Closing database connections...");
    // Close Drizzle ORM connection if needed

    // Close PostgreSQL connection pool
    await pgPool.end();
    log("Database connections closed successfully");
    return true;
  } catch (error) {
    console.error("Error closing database connections:", error);
    return false;
  }
}

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  log(`Received ${signal} signal. Shutting down gracefully...`);

  // Close database connections
  await closeDatabaseConnections();

  // Add any other cleanup tasks here

  log("All connections closed. Exiting process.");
  process.exit(0);
}

// Add shutdown handlers
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

startServer();
