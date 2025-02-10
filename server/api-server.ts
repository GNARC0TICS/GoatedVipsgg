import express from "express";
import cookieParser from "cookie-parser";
import { log } from "./vite";
import { setupAuth } from "./auth";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { requireAdmin, requireAuth } from "./middleware/auth";
import { db } from "@db";
import { registerRoutes } from "./routes";
import { initializeAdmin } from "./middleware/admin";
import { createServer } from "http";

const app = express();
const API_PORT = 3001;

// Rate limiting setup
const rateLimiter = new RateLimiterMemory({
  points: 60,
  duration: 1,
});

async function setupMiddleware() {
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  // Enable CORS for the frontend
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', `http://0.0.0.0:5000`);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });
}

// Basic request logging
function requestLogger(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`, 'api-server');
  });

  next();
}

function errorHandler(
  err: Error,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction,
) {
  console.error("API Server error:", err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
}

async function startAPIServer() {
  try {
    // Setup basic middleware
    await setupMiddleware();
    
    // Add logging and error handling
    app.use(requestLogger);
    app.use(errorHandler);

    // Setup auth middleware
    setupAuth(app);
    
    // Initialize admin
    initializeAdmin().catch(console.error);

    // Register all routes
    const server = createServer(app);
    registerRoutes(app);

    server
      .listen(API_PORT, "0.0.0.0")
      .on("error", (err: NodeJS.ErrnoException) => {
        console.error(`Failed to start API server: ${err.message}`);
        process.exit(1);
      })
      .on("listening", () => {
        log(`API Server running on port ${API_PORT} (http://0.0.0.0:${API_PORT})`, 'api-server');
      });

  } catch (error) {
    console.error("Failed to start API server:", error);
    process.exit(1);
  }
}

startAPIServer();
