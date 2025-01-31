import express from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "@db";
import { sql } from "drizzle-orm";
import { createServer } from "http";
import { setupAuth } from "./auth";
import { initializeAdmin } from "./middleware/admin";

const app = express();
const INTERNAL_PORT = 5000;
const EXTERNAL_PORT = 80;

async function checkDatabase() {
  try {
    await db.execute(sql`SELECT 1`);
    log("Database connection successful");
    return true;
  } catch (error: any) {
    if (error.message?.includes("endpoint is disabled")) {
      log("Database endpoint is disabled. Please enable the database in the Replit Database tab.");
    } else {
      console.error("Database connection error:", error);
    }
    return false;
  }
}

async function setupMiddleware() {
  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // CORS setup
  app.use((_req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    next();
  });

  // Request logging middleware
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      const start = Date.now();
      res.on("finish", () => {
        const duration = Date.now() - start;
        log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
      });
    }
    next();
  });

  // Error handling middleware
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Server error:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  });

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "healthy" });
  });
}

async function startServer() {
  try {
    log("Starting server initialization...");

    // Check database first
    const dbConnected = await checkDatabase();
    if (!dbConnected) {
      throw new Error("Database connection failed");
    }

    // Setup core middleware
    await setupMiddleware();

    // Create HTTP server
    const server = createServer(app);

    // Setup authentication
    setupAuth(app);

    // Register API routes
    registerRoutes(app);

    // Initialize admin after routes
    await initializeAdmin();

    // Setup Vite for development or serve static files for production
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start listening
    server.listen(INTERNAL_PORT, "0.0.0.0", () => {
      log(`Server running on internal port ${INTERNAL_PORT} (http://0.0.0.0:${INTERNAL_PORT})`);
      log(`Server accessible externally on port ${EXTERNAL_PORT}`);
    });

    // Graceful shutdown
    const shutdown = () => {
      log("Shutting down gracefully...");
      server.close(() => {
        process.exit(0);
      });
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
startServer();