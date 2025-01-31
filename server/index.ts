import express, { type Express } from "express";
import { createServer as createHttpServer } from "http";
import { db } from "@db";
import { sql } from "drizzle-orm";
import { setupAuth } from "./auth";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "healthy" });
});

// Database check
async function checkDatabase() {
  try {
    await db.execute(sql`SELECT 1`);
    log("Database connection established successfully");
  } catch (error: any) {
    log(`Database connection error: ${error.message}`);
    process.exit(1);
  }
}

async function startServer() {
  try {
    log("Starting server initialization...");
    await checkDatabase();

    // Setup authentication
    setupAuth(app);

    // Register API routes
    registerRoutes(app);

    const server = createHttpServer(app);

    // Setup Vite in development
    if (process.env.NODE_ENV !== "production") {
      await setupVite(app, server);
    }

    const listenPort = Number(PORT);
    server.listen(listenPort, () => {
      log(`Server running on port ${listenPort}`);
    });

  } catch (error) {
    log(`Failed to start server: ${error}`);
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