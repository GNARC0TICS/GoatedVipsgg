
import express from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "@db";
import { sql } from "drizzle-orm";
import { promisify } from "util";
import { exec } from "child_process";

const execAsync = promisify(exec);
const app = express();
const PORT = 5000;

async function setupMiddleware() {
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(requestLogger);
  app.use(errorHandler);
}

function requestLogger(req: express.Request, res: express.Response, next: express.NextFunction) {
  const start = Date.now();
  const path = req.path;
  let capturedResponse: Record<string, any> | undefined;

  const originalJson = res.json;
  res.json = function(body, ...args) {
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

function errorHandler(err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) {
  console.error("Server error:", err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
}

async function checkDatabase() {
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
}

async function cleanupPort() {
  try {
    const { stdout } = await execAsync(`lsof -t -i:${PORT}`);
    if (stdout) {
      const pid = parseInt(stdout.trim());
      if (pid !== process.pid) {
        await execAsync(`kill -9 ${pid}`);
        log(`Killed existing process on port ${PORT}`);
      }
    }
  } catch (error) {
    // No process running on port, we can proceed
  }
}

async function startServer() {
  try {
    log("Starting server initialization...");
    await checkDatabase();
    await cleanupPort();
    await setupMiddleware();

    const server = registerRoutes(app);

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    server.listen(PORT, "0.0.0.0")
      .on("error", (err: NodeJS.ErrnoException) => {
        console.error(`Failed to start server: ${err.message}`);
        process.exit(1);
      })
      .on("listening", () => {
        log(`Server running on port ${PORT}`);
      });

  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
}

startServer();
