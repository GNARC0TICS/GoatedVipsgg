import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const telegramUsers = pgTable('telegram_users', {
  id: integer('id').primaryKey(),
  telegramId: text('telegram_id').notNull().unique(),
  goatedUsername: text('goated_username'),
  isVerified: boolean('is_verified').default(false),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  lastActive: timestamp('last_active').default(sql`CURRENT_TIMESTAMP`),
  notificationsEnabled: boolean('notifications_enabled').default(true),
});

// Table to store pending verification requests
export const verificationRequests = pgTable('verification_requests', {
  id: integer('id').primaryKey(),
  telegramId: text('telegram_id').notNull(),
  goatedUsername: text('goated_username').notNull(),
  requestedAt: timestamp('requested_at').default(sql`CURRENT_TIMESTAMP`),
  status: text('status').default('pending'), // pending, approved, rejected
  adminNotes: text('admin_notes'),
});