import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { users } from "../schema";

export const supportTickets = pgTable('support_tickets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  subject: text('subject').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('open'),
  priority: text('priority').notNull().default('medium'),
  assignedTo: integer('assigned_to').references(() => users.id),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`)
});

export const ticketMessages = pgTable('ticket_messages', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id').references(() => supportTickets.id),
  userId: integer('user_id').references(() => users.id),
  message: text('message').notNull(),
  isStaffReply: boolean('is_staff_reply').default(false),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`)
});

// Relations
export const ticketMessageRelations = relations(ticketMessages, ({ one }) => ({
  ticket: one(supportTickets, {
    fields: [ticketMessages.ticketId],
    references: [supportTickets.id]
  }),
  user: one(users, {
    fields: [ticketMessages.userId],
    references: [users.id]
  })
}));

export const supportTicketRelations = relations(supportTickets, ({ one, many }) => ({
  assignedStaff: one(users, {
    fields: [supportTickets.assignedTo],
    references: [users.id]
  }),
  user: one(users, {
    fields: [supportTickets.userId],
    references: [users.id]
  }),
  messages: many(ticketMessages)
}));