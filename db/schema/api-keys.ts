import {
  pgTable,
  text,
  timestamp,
  boolean,
  serial,
  integer,
  json,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { users } from "./tables";
import {
  createInsertSchema as createZodInsertSchema,
  createSelectSchema as createZodSelectSchema,
} from "drizzle-zod";

/**
 * API Keys Table
 * 
 * This table stores API keys for service-to-service authentication,
 * particularly for the standalone Telegram bot to authenticate with
 * the main GoatedVIPs platform.
 */
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),                  // Descriptive name (e.g., "Telegram Bot")
  key: text("key").notNull().unique(),           // Public API key (sent in requests)
  secret: text("secret").notNull(),              // Secret for signing requests (never transmitted)
  permissions: json("permissions").default({}),  // Granular permissions for this key
  ipWhitelist: text("ip_whitelist"),             // Optional comma-separated list of allowed IPs
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  expiresAt: timestamp("expires_at"),            // Optional expiration date
  lastUsedAt: timestamp("last_used_at"),         // Tracking for key rotation
  createdBy: integer("created_by").references(() => users.id),
  isActive: boolean("is_active").default(true),  // Can be disabled without deletion
  rateLimit: integer("rate_limit").default(100), // Requests per minute allowed
  metadata: json("metadata").default({}),        // Additional data (e.g., deployment info)
});

/**
 * API Key Usage Table
 * 
 * This table tracks API key usage for auditing and rate limiting purposes.
 */
export const apiKeyUsage = pgTable("api_key_usage", {
  id: serial("id").primaryKey(),
  keyId: integer("key_id").references(() => apiKeys.id),
  endpoint: text("endpoint").notNull(),          // Which endpoint was accessed
  method: text("method").notNull(),              // HTTP method used
  timestamp: timestamp("timestamp").default(sql`CURRENT_TIMESTAMP`),
  ip: text("ip"),                                // Source IP address
  userAgent: text("user_agent"),                 // User agent string
  success: boolean("success").default(true),     // Whether request was successful
  responseTime: integer("response_time"),        // Response time in ms
  errorCode: text("error_code"),                 // Error code if failed
});

/**
 * Used Nonces Table
 * 
 * This table stores used nonces to prevent replay attacks in signed requests.
 */
export const usedNonces = pgTable("used_nonces", {
  nonce: text("nonce").primaryKey(),
  timestamp: timestamp("timestamp").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

/**
 * Security Events Table
 * 
 * This table logs security-related events for auditing and monitoring.
 */
export const securityEvents = pgTable("security_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(),
  severity: text("severity").notNull(),
  timestamp: timestamp("timestamp").default(sql`CURRENT_TIMESTAMP`),
  ip: text("ip"),
  telegramId: text("telegram_id"),
  apiKeyId: integer("api_key_id"),
  details: json("details").default({}),
});

// Define relations
export const apiKeyRelations = relations(apiKeys, ({ one }) => ({
  creator: one(users, {
    fields: [apiKeys.createdBy],
    references: [users.id],
  }),
}));

// Create zod schemas for validation
export const insertApiKeySchema = createZodInsertSchema(apiKeys);
export const selectApiKeySchema = createZodSelectSchema(apiKeys);
export const insertApiKeyUsageSchema = createZodInsertSchema(apiKeyUsage);
export const selectApiKeyUsageSchema = createZodSelectSchema(apiKeyUsage);
export const insertUsedNonceSchema = createZodInsertSchema(usedNonces);
export const selectUsedNonceSchema = createZodSelectSchema(usedNonces);
export const insertSecurityEventSchema = createZodInsertSchema(securityEvents);
export const selectSecurityEventSchema = createZodSelectSchema(securityEvents);

// Export types
export type InsertApiKey = typeof apiKeys.$inferInsert;
export type SelectApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKeyUsage = typeof apiKeyUsage.$inferInsert;
export type SelectApiKeyUsage = typeof apiKeyUsage.$inferSelect;
export type InsertUsedNonce = typeof usedNonces.$inferInsert;
export type SelectUsedNonce = typeof usedNonces.$inferSelect;
export type InsertSecurityEvent = typeof securityEvents.$inferInsert;
export type SelectSecurityEvent = typeof securityEvents.$inferSelect;
