import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable('users', {
  id: integer('id').primaryKey(),
  username: text('username').notNull().unique(),
  telegramId: text('telegram_id').unique(),
  isAdmin: boolean('is_admin').default(false),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  lastLogin: timestamp('last_login'),
});