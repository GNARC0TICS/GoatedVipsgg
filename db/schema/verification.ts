
import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const verificationRequests = pgTable('verification_requests', {
  id: integer('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  requestedUsername: text('requested_username').notNull(),
  status: text('status').default('pending'),
  adminNotes: text('admin_notes'),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
