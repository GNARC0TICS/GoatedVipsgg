import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "@db";
import { sql } from "drizzle-orm";

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware with enhanced error tracking
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

// Error handling middleware with detailed logging
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Server error:", err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

// Application startup with enhanced error handling
async function startServer() {
  try {
    // Initialize critical services in sequence
    log("Starting server initialization...");

    // 1. Database check
    try {
      await db.execute(sql`SELECT 1`);
      log("Database connection successful");
    } catch (error: any) {
      if (error.message?.includes('endpoint is disabled')) {
        log("Database endpoint is disabled. Please enable the database in the Replit Database tab.");
      } else {
        throw error;
      }
    }

    // 2. API connectivity check
    const apiCheck = await fetch(`${process.env.API_BASE_URL || 'https://europe-west2-g3casino.cloudfunctions.net/user/affiliate'}/health`).catch(() => null);
    if (!apiCheck?.ok) {
      log("Warning: API health check failed - continuing startup");
    } else {
      log("API connection successful");
    }

    // 3. Create server and register routes
    const server = registerRoutes(app);

    // Setup Vite in development
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start server with enhanced error handling
    const BASE_PORT = 5000;
    let currentPort = BASE_PORT;
    const MAX_RETRIES = 5;

    function tryListen(port: number, retryCount = 0) {
      server.listen(port, "0.0.0.0")
        .on("error", (err: NodeJS.ErrnoException) => {
          if (err.code === "EADDRINUSE" && retryCount < MAX_RETRIES) {
            log(`Port ${port} is in use, trying ${port + 1}...`);
            tryListen(port + 1, retryCount + 1);
          } else if (retryCount >= MAX_RETRIES) {
            console.error(`Failed to find an available port after ${MAX_RETRIES} attempts`);
            process.exit(1);
          } else {
            console.error("Failed to start server:", err);
            process.exit(1);
          }
        })
        .on("listening", () => {
          log(`Server running on port ${port}`);
        });
    }

    tryListen(currentPort);

  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
}

startServer();