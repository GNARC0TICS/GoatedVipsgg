import { pgTable, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "@db/schema";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const telegramUsers = pgTable('telegram_users', {
  telegramId: text('telegram_id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  telegramUsername: text('telegram_username'),
  isVerified: boolean('is_verified').default(false),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: text('verified_by'),
  notificationsEnabled: boolean('notifications_enabled').default(true),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Define relations
export const telegramUserRelations = relations(telegramUsers, ({ one }) => ({
  user: one(users, {
    fields: [telegramUsers.userId],
    references: [users.id],
  }),
}));

// Export schemas for Zod validation
export const insertTelegramUserSchema = createInsertSchema(telegramUsers);
export const selectTelegramUserSchema = createSelectSchema(telegramUsers);

// Export types for TypeScript
export type InsertTelegramUser = typeof telegramUsers.$inferInsert;
export type SelectTelegramUser = typeof telegramUsers.$inferSelect;