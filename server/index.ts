import express from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "@db";
import { sql } from "drizzle-orm";
import { promisify } from "util";
import { exec } from "child_process";
import { createServer } from "http";

const execAsync = promisify(exec);
const app = express();

const PORT = Number(process.env.PORT) || 5000;

async function setupMiddleware(app: express.Application) {
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(requestLogger);
  app.use(errorHandler);
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
  res.json = function (body: any) {
    capturedResponse = body;
    return originalJson.call(res, body);
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

async function cleanupPort(port: number) {
  try {
    await execAsync(`lsof -ti:${port} | xargs kill -9`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    log("No existing process found on port " + port);
  }
}

async function startServer(app: express.Application, port: number) {
  try {
    await cleanupPort(port);
    const server = createServer(app);

    return new Promise((resolve, reject) => {
      server
        .listen(port, "0.0.0.0")
        .on("error", async (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            log(`Port ${port} is in use, attempting to free it...`);
            await cleanupPort(port);
            server.listen(port, "0.0.0.0");
          } else {
            console.error(`Failed to start server: ${err.message}`);
            reject(err);
          }
        })
        .on("listening", () => {
          log(`Server running on port ${port} (http://0.0.0.0:${port})`);
          resolve(server);
        });

      registerRoutes(app, server);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    throw error;
  }
}

async function initializeServer() {
  try {
    log("Starting server initialization...");
    await checkDatabase();
    await setupMiddleware(app);

    // Setup Vite or serve static files based on environment
    if (app.get("env") === "development") {
      const server = await startServer(app, PORT);
      await setupVite(app, server);
    } else {
      serveStatic(app);
      await startServer(app, PORT);
    }
  } catch (error) {
    console.error("Failed to initialize server:", error);
    process.exit(1);
  }
}

initializeServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});