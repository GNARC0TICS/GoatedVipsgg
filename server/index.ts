import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { registerRoutes, setupWebSocket } from "./routes";

const API_PORT = parseInt(process.env.API_PORT || '5000', 10);
const HOST = '0.0.0.0';

async function startServer() {
  const app = express();

  // Basic middleware
  app.use(express.json());
  app.use(cors());

  // Basic health check endpoint
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // Setup WebSocket server
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: "/ws/leaderboard"
  });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    ws.on('error', console.error);
    ws.on('close', () => console.log('Client disconnected'));
  });

  // Register routes
  registerRoutes(app);

  // Start server
  return new Promise((resolve, reject) => {
    try {
      httpServer.listen(API_PORT, HOST, () => {
        console.log(`Server running at http://${HOST}:${API_PORT}`);
        resolve(httpServer);
      });

      // Handle server errors
      httpServer.on('error', (error) => {
        console.error('Server error:', error);
        reject(error);
      });

      // Graceful shutdown
      const shutdown = () => {
        console.log('Shutting down server...');
        httpServer.close(() => {
          console.log('Server stopped');
          process.exit(0);
        });

        // Force exit after timeout
        setTimeout(() => {
          console.error('Forced shutdown after timeout');
          process.exit(1);
        }, 10000);
      };

      process.on('SIGTERM', shutdown);
      process.on('SIGINT', shutdown);

    } catch (error) {
      console.error('Failed to start server:', error);
      reject(error);
    }
  });
}

startServer().catch(error => {
  console.error('Server startup failed:', error);
  process.exit(1);
});