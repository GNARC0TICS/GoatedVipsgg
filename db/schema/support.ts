import { pgTable, serial, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { users } from "./users";
import { relations } from "drizzle-orm";

export const supportMessages = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  username: text("username"),
  message: text("message").notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const supportReadStatus = pgTable("support_read_status", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  messageId: integer("message_id").references(() => supportMessages.id),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const supportMessagesRelations = relations(supportMessages, ({ one }) => ({
  user: one(users, {
    fields: [supportMessages.userId],
    references: [users.id]
  })
}));

export const supportReadStatusRelations = relations(supportReadStatus, ({ one }) => ({
  user: one(users, {
    fields: [supportReadStatus.userId],
    references: [users.id]
  }),
  message: one(supportMessages, {
    fields: [supportReadStatus.messageId],
    references: [supportMessages.id]
  })
}))