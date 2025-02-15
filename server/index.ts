import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { WebSocket, WebSocketServer } from "ws";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { promisify } from "util";
import { exec } from "child_process";
import { sql } from "drizzle-orm";
import { log } from "./utils/logger";
import { initializeBot } from "./telegram/bot";
import { registerRoutes } from "./routes";
import { initializeAdmin } from "./middleware/admin";
import { db } from "../db";
import { setupAuth } from "./auth";
import cors from "cors";
import session from "express-session";
import connectPg from "connect-pg-simple";

const execAsync = promisify(exec);
const PORT = parseInt(process.env.PORT || '5000', 10);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let templateCache: string | null = null;
let server: any = null;
let bot: any = null;
let wss: WebSocketServer | null = null;

async function isPortAvailable(port: number): Promise<boolean> {
  try {
    await execAsync(`lsof -i:${port}`);
    return false;
  } catch {
    return true;
  }
}

async function waitForPort(port: number, timeout = 30000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await isPortAvailable(port)) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(`Timeout waiting for port ${port} to become available`);
}

// Test database connection
async function testDbConnection() {
  try {
    await db.execute(sql`SELECT 1`);
    console.log("Database connection successful");
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}

async function initializeServer() {
  try {
    log("info", "Starting server initialization...");

    // Wait for port to be available
    await waitForPort(PORT);
    log("info", "Port available, proceeding with initialization");

    // Check database connection
    await testDbConnection();
    log("info", "Database connection established");

    const app = express();
    setupMiddleware(app);
    setupAuth(app);
    registerRoutes(app);

    // Initialize admin after routes are set up
    await initializeAdmin().catch(error => {
      log("error", `Admin initialization error: ${error instanceof Error ? error.message : String(error)}`);
    });

    server = createServer(app);
    setupWebSocket(server);

    // Initialize Telegram bot
    log("info", "Initializing Telegram bot...");
    bot = await initializeBot();
    if (!bot) {
      log("error", "Failed to initialize Telegram bot - continuing without bot functionality");
    } else {
      log("info", "Telegram bot initialized successfully");
    }

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Error handler
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error("Server error:", err);
      res.status(500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
      });
    });

    return new Promise((resolve, reject) => {
      server.listen(PORT, "0.0.0.0", () => {
        log("info", `Server is ready at http://0.0.0.0:${PORT}`);
        // Signal that all components are initialized and the port is ready
        console.log(`PORT=${PORT}`);
        console.log(`PORT_READY=${PORT}`);
        resolve(server);
      }).on("error", (err: Error) => {
        log("error", `Server failed to start: ${err.message}`);
        reject(err);
      });

      const shutdown = async () => {
        log("info", "Shutting down gracefully...");
        if (bot) {
          try {
            await bot.stopPolling();
            log("info", "Telegram bot stopped");
          } catch (error) {
            log("error", "Error stopping Telegram bot");
          }
        }
        if (wss) {
          wss.close(() => {
            log("info", "WebSocket server closed");
          });
        }
        server.close(() => {
          log("info", "HTTP server closed");
          process.exit(0);
        });

        // Force exit after 10 seconds if graceful shutdown fails
        setTimeout(() => {
          log("error", "Forced shutdown after timeout");
          process.exit(1);
        }, 10000);
      };

      process.on("SIGTERM", shutdown);
      process.on("SIGINT", shutdown);
    });
  } catch (error) {
    log("error", `Failed to start application: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

function setupWebSocket(server: any) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req: any) => {
    // Ignore Vite HMR connections
    if (req.headers['sec-websocket-protocol']?.includes('vite-hmr')) {
      return;
    }

    log("info", "New WebSocket connection established");

    ws.on('error', (error) => {
      log("error", `WebSocket error: ${error.message}`);
    });
  });

  return wss;
}

function setupMiddleware(app: express.Application) {
  app.set('trust proxy', 1);
  app.use('/api', cors({
    origin: process.env.NODE_ENV === 'development'
      ? ['http://localhost:5000', 'http://0.0.0.0:5000']
      : process.env.ALLOWED_ORIGINS?.split(',') || [],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
  }));

  const PostgresSessionStore = connectPg(session);
  app.use(session({
    store: new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  }));

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());
  app.use(requestLogger);
}

const requestLogger = (() => {
  const logQueue: string[] = [];
  let flushTimeout: NodeJS.Timeout | null = null;

  const flushLogs = () => {
    if (logQueue.length > 0) {
      console.log(logQueue.join('\n'));
      logQueue.length = 0;
    }
    flushTimeout = null;
  };

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const start = Date.now();
    res.on("finish", () => {
      if (req.path.startsWith("/api")) {
        const duration = Date.now() - start;
        logQueue.push(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
        if (!flushTimeout) {
          flushTimeout = setTimeout(flushLogs, 1000);
        }
      }
    });
    next();
  };
})();

function serveStatic(app: express.Application) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(`Could not find the build directory: ${distPath}. Please build the client first.`);
  }
  app.use(express.static(distPath, {
    maxAge: '1d',
    etag: true,
    lastModified: true
  }));
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"), {
      headers: {
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  });
}

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const viteConfig = defineConfig({
  plugins: [react(), runtimeErrorOverlay(), themePlugin()],
  resolve: {
    alias: {
      "@db": path.resolve(__dirname, "../db"),
      "@": path.resolve(__dirname, "../client/src"),
    },
  },
  root: path.resolve(__dirname, "../client"),
  build: {
    outDir: path.resolve(__dirname, "../dist/public"),
    emptyOutDir: true,
  },
});

async function setupVite(app: express.Application, server: any) {
  const viteLogger = createLogger();
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: "custom",
  });

  app.use(vite.middlewares);

  const loadTemplate = async () => {
    if (!templateCache) {
      const clientTemplate = path.resolve(__dirname, "..", "client", "index.html");
      templateCache = await fs.promises.readFile(clientTemplate, "utf-8");
    }
    return templateCache;
  };

  app.use("*", async (req, res, next) => {
    try {
      let template = await loadTemplate();
      template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${Date.now()}"`);
      const page = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({
        "Content-Type": "text/html",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff"
      }).end(page);
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      next(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

initializeServer().catch((error) => {
  log("error", `Server startup error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});