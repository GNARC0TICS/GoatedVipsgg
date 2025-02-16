import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "@db/schema";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const verificationRequests = pgTable('verification_requests', {
  id: integer('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  telegramId: text('telegram_id').notNull(),
  telegramUsername: text('telegram_username').notNull(),
  goatedUsername: text('goated_username').notNull(),
  status: text('status').default('pending'),
  verifiedBy: text('verified_by'),
  verifiedAt: timestamp('verified_at'),
  requestedAt: timestamp('requested_at').default(sql`CURRENT_TIMESTAMP`),
  adminNotes: text('admin_notes'),
});

// Define relations
export const verificationRequestRelations = relations(verificationRequests, ({ one }) => ({
  user: one(users, {
    fields: [verificationRequests.userId],
    references: [users.id],
  }),
}));

// Export schemas for validation
export const insertVerificationRequestSchema = createInsertSchema(verificationRequests);
export const selectVerificationRequestSchema = createSelectSchema(verificationRequests);

// Export types
export type InsertVerificationRequest = typeof verificationRequests.$inferInsert;
export type SelectVerificationRequest = typeof verificationRequests.$inferSelect;