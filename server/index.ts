import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "@db";
import { sql } from "drizzle-orm";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
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

    // 2. Kill existing process on port 5000 if any
    const port = 5000;
    try {
      const { stdout } = await execAsync(`lsof -t -i:${port}`);
      if (stdout) {
        const pid = parseInt(stdout.trim());
        if (pid !== process.pid) {
          await execAsync(`kill -9 ${pid}`);
          log(`Killed existing process on port ${port}`);
        }
      }
    } catch (error) {
      // No process running on port, we can proceed
    }

    // 3. Create server and register routes
    const server = registerRoutes(app);

    // Setup Vite in development
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start server
    server.listen(port, "0.0.0.0")
      .on("error", (err: NodeJS.ErrnoException) => {
        console.error(`Failed to start server: ${err.message}`);
        process.exit(1);
      })
      .on("listening", () => {
        log(`Server running on port ${port}`);
      });

  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
}

startServer();