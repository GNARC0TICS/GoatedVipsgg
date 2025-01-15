import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "@db";
import { sql } from "drizzle-orm";

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
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

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Global error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ error: message });
});

// Application startup
(async () => {
  try {
    // Test database connection
    await db.execute(sql`SELECT 1`);
    log("Database connection successful");

    // Create server and register routes (which also sets up auth)
    const server = registerRoutes(app);

    // Setup Vite in development
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start server with port retry logic
    const startServer = (port: number, maxRetries = 3, retryCount = 0) => {
      server.listen(port, "0.0.0.0", () => {
        log(`Server running on port ${port}`);
      }).on('error', (err: any) => {
        if (err.code === 'EADDRINUSE' && retryCount < maxRetries) {
          log(`Port ${port} is in use, trying ${port + 1}...`);
          startServer(port + 1, maxRetries, retryCount + 1);
        } else {
          console.error("Failed to start server:", err);
          process.exit(1);
        }
      });
    };

    startServer(5000);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();