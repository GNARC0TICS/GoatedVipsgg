import express from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "@db";
import { sql } from "drizzle-orm";
import { promisify } from "util";
import { exec } from "child_process";
import { createServer } from "http";
import { setupAuth } from "./auth";
import { initializeAdmin } from "./middleware/admin";

const execAsync = promisify(exec);
const app = express();
const PORT = 5000;

async function setupMiddleware() {
  // Basic middleware setup
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser(process.env.REPL_ID || 'session-secret'));

  // API middleware
  app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // Set up authentication before API routes
  setupAuth(app);

  // Other middleware
  app.use(requestLogger);
  app.use(errorHandler);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "healthy" });
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

function errorHandler(
  err: Error,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction,
) {
  console.error("Server error:", err);
  res.status(500).json({ 
    ok: false,
    error: err.message || "Internal Server Error" 
  });
}

async function checkDatabase() {
  try {
    await db.execute(sql`SELECT 1`);
    log("Database connection successful");
  } catch (error: any) {
    if (error.message?.includes("endpoint is disabled")) {
      log(
        "Database endpoint is disabled. Please enable the database in the Replit Database tab.",
      );
    } else {
      throw error;
    }
  }
}

async function cleanupPort() {
  try {
    await execAsync(`lsof -ti:${PORT} | xargs kill -9`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    log("No existing process found on port " + PORT);
  }
}

async function startServer() {
  try {
    log("Starting server initialization...");
    await checkDatabase();
    await cleanupPort();

    // Create HTTP server first
    const server = createServer(app);

    // Set up middleware before routes
    await setupMiddleware();

    // Initialize admin user after middleware setup
    await initializeAdmin().catch(console.error);

    // Set up API routes
    registerRoutes(app);

    // Set up Vite last to prevent interference with API routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    server
      .listen(PORT, "0.0.0.0")
      .on("error", async (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          log(`Port ${PORT} is in use, attempting to free it...`);
          await cleanupPort();
          server.listen(PORT, "0.0.0.0");
          return;
        }
        console.error(`Failed to start server: ${err.message}`);
        process.exit(1);
      })
      .on("listening", () => {
        log(`Server running on port ${PORT} (http://0.0.0.0:${PORT})`);
      });

  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  log('Received SIGTERM signal. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('Received SIGINT signal. Shutting down gracefully...');
  process.exit(0);
});

startServer();