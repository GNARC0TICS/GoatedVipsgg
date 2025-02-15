import { pgTable, text, timestamp, boolean, serial, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "@db/schema";
import { relations } from "drizzle-orm";

export const telegramUsers = pgTable('telegram_users', {
  telegramId: text('telegram_id').primaryKey(),
  telegramUsername: text('telegram_username'),
  userId: integer('user_id').notNull(),  // Changed to integer to match schema
  isVerified: boolean('is_verified').default(false),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  notificationsEnabled: boolean('notifications_enabled').default(true),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: text('verified_by'),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`)
});

export const verificationRequests = pgTable('verification_requests', {
  id: serial('id').primaryKey(),
  telegramId: text('telegram_id').notNull(),
  userId: integer('user_id').notNull(),  // Changed to integer to match schema
  requestedAt: timestamp('requested_at').default(sql`CURRENT_TIMESTAMP`),
  status: text('status').default('pending'),
  adminNotes: text('admin_notes'),
  telegramUsername: text('telegram_username'),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: text('verified_by'),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`)
});

// Define relations
export const telegramUserRelations = relations(telegramUsers, ({ one }) => ({
  user: one(users, {
    fields: [telegramUsers.userId],
    references: [users.id],
  }),
}));

export const verificationRequestRelations = relations(verificationRequests, ({ one }) => ({
  user: one(users, {
    fields: [verificationRequests.userId],
    references: [users.id],
  }),
  telegramUser: one(telegramUsers, {
    fields: [verificationRequests.telegramId],
    references: [telegramUsers.telegramId],
  }),
}));