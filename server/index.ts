import express from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "@db";
import { sql } from "drizzle-orm";
import { promisify } from "util";
import { exec } from "child_process";
import { createServer } from "http";
import { initializeAdmin } from "./middleware/admin";

const execAsync = promisify(exec);
const app = express();
const PORT = 5000;

// Create a dedicated router for API endpoints
const apiRouter = express.Router();

// API health check endpoint
apiRouter.get("/health", (_req, res) => {
  res.json({ status: "healthy" });
});

async function setupMiddleware() {
  // Basic middleware setup
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  // Mount API router for all /api routes before any other middleware
  app.use("/api", (req, res, next) => {
    // Set proper headers for API responses
    res.setHeader('Content-Type', 'application/json');
    next();
  }, apiRouter);
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
  res.status(500).json({ error: err.message || "Internal Server Error" });
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

    // Setup basic middleware and API router first
    await setupMiddleware();

    // Add logging and error handling for API routes
    app.use(requestLogger);
    app.use(errorHandler);

    // Register all routes and WebSocket handlers
    registerRoutes(app);

    // Initialize admin after routes
    initializeAdmin().catch(console.error);

    // Setup Vite or static serving last
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
        } else {
          console.error(`Failed to start server: ${err.message}`);
          process.exit(1);
        }
      })
      .on("listening", () => {
        log(`Server running on port ${PORT} (http://0.0.0.0:${PORT})`);
      });

  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
}

startServer();