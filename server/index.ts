import express from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "@db";
import { sql } from "drizzle-orm";
import { promisify } from "util";
import { exec } from "child_process";
import { createServer } from "http";

const execAsync = promisify(exec);
const app = express();
const BASE_PORT = 5000;
const MAX_PORT_ATTEMPTS = 5;

async function setupMiddleware() {
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
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

async function findAvailablePort(startPort: number): Promise<number> {
  for (let port = startPort; port < startPort + MAX_PORT_ATTEMPTS; port++) {
    try {
      const server = createServer();
      await new Promise((resolve, reject) => {
        server.listen(port, "0.0.0.0")
          .once('listening', () => {
            server.close();
            resolve(port);
          })
          .once('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE') {
              resolve(null);
            } else {
              reject(err);
            }
          });
      });
      return port;
    } catch (err) {
      if (port === startPort + MAX_PORT_ATTEMPTS - 1) {
        throw new Error('No available ports found');
      }
    }
  }
  throw new Error('No available ports found');
}

async function startServer() {
  try {
    log("Starting server initialization...");
    await checkDatabase();
    await setupMiddleware();

    const server = registerRoutes(app);
    const port = await findAvailablePort(BASE_PORT);

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    server
      .listen(port, "0.0.0.0")
      .on("error", (err: NodeJS.ErrnoException) => {
        console.error(`Failed to start server: ${err.message}`);
        process.exit(1);
      })
      .on("listening", () => {
        log(`Server running on port ${port} (http://0.0.0.0:${port})`);
      });
  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  log('Received SIGTERM signal. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('Received SIGINT signal. Shutting down gracefully...');
  process.exit(0);
});

startServer();