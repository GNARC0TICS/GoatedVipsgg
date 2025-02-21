
import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable('users', {
  id: integer('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  email: text('email').unique().notNull(),
  isAdmin: boolean('is_admin').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastLogin: timestamp('last_login').default(sql`CURRENT_TIMESTAMP`),
  lastLoginIp: text('last_login_ip'),
});
