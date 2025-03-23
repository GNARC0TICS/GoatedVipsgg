// Imports
import express, { Express } from "express";
import { requireAdmin, requireAuth } from "./middleware/auth";
import userSessionsRouter from "./routes/user-sessions";
import userProfileRouter from "./routes/user-profile";
import telegramApiRouter from "./routes/telegram-api";
import apiTokensRouter from "./routes/api-tokens";
import fallbackApiRouter from "./routes/fallback-api";
import testFallbackRouter from "./routes/test-fallback";
import { db, pgPool } from "../db/connection";
// Import specific schemas from the updated schema structure
import * as schema from "@db/schema";

// Main function to register routes
export function registerRoutes(app: Express) {
  // Register user session routes
  app.use(userSessionsRouter);
  // Register user profile routes
  app.use(userProfileRouter);
  // Register Telegram API routes
  app.use("/api/telegram", telegramApiRouter);
  // Register API tokens routes
  app.use("/api/admin/api-tokens", apiTokensRouter);
  // Register test fallback routes
  app.use("/api/test-fallback", testFallbackRouter);
  // Register fallback API routes
  app.use("/api", fallbackApiRouter);
  
  // Add any other routes here
}
