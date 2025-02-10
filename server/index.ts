import express from "express";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";
import "./api-server"; // Start the API server

const app = express();
const PORT = 5000;

async function startMainServer() {
  try {
    log("Starting main server initialization...");

    // Create HTTP server
    const server = createServer(app);

    // Setup frontend serving
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    server
      .listen(PORT, "0.0.0.0")
      .on("error", (err: NodeJS.ErrnoException) => {
        console.error(`Failed to start main server: ${err.message}`);
        process.exit(1);
      })
      .on("listening", () => {
        log(`Main server running on port ${PORT} (http://0.0.0.0:${PORT})`);
      });

  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
}

startMainServer();