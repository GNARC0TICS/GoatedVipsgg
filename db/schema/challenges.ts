import { pgTable, text, timestamp, boolean, serial, integer, decimal, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "@db/schema";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// Wheel spins table
export const wheelSpins = pgTable("wheel_spins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  segmentIndex: integer("segment_index").notNull(),
  rewardCode: text("reward_code"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Bonus codes table
export const bonusCodes = pgTable("bonus_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description"),
  bonusAmount: text("bonus_amount").notNull(),
  requiredWager: text("required_wager"),
  totalClaims: integer("total_claims"),
  currentClaims: integer("current_claims").default(0),
  expiresAt: timestamp("expires_at").notNull(),
  status: text("status").default("active"),
  source: text("source").default("web"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`)
});

// Wager races table
export const wagerRaces = pgTable("wager_races", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(), // 'weekly' | 'monthly' | 'weekend'
  status: text("status").notNull(), // 'upcoming' | 'live' | 'completed'
  prizePool: decimal("prize_pool", { precision: 18, scale: 2 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  minWager: decimal("min_wager", { precision: 18, scale: 2 }).notNull(),
  prizeDistribution: jsonb("prize_distribution").notNull(), // { "1": 25, "2": 15, ... }
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  rules: text("rules"),
  description: text("description"),
});

export const wagerRaceParticipants = pgTable("wager_race_participants", {
  id: serial("id").primaryKey(),
  raceId: integer("race_id").references(() => wagerRaces.id),
  userId: integer("user_id").references(() => users.id),
  totalWager: decimal("total_wager", { precision: 18, scale: 2 }).notNull(),
  rank: integer("rank"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  wagerHistory: jsonb("wager_history"), // Track wager progress over time
});

// Support System tables
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"), // 'open' | 'in_progress' | 'closed'
  priority: text("priority").notNull().default("medium"), // 'low' | 'medium' | 'high'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const ticketMessages = pgTable("ticket_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => supportTickets.id),
  userId: integer("user_id").references(() => users.id),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isStaffReply: boolean("is_staff_reply").default(false).notNull(),
});

// Relations
export const wheelSpinRelations = relations(wheelSpins, ({ one }) => ({
  user: one(users, {
    fields: [wheelSpins.userId],
    references: [users.id],
  }),
}));

export const bonusCodeRelations = relations(bonusCodes, ({ one }) => ({
  creator: one(users, {
    fields: [bonusCodes.createdBy],
    references: [users.id],
  }),
}));

export const wagerRaceRelations = relations(wagerRaces, ({ many }) => ({
  participants: many(wagerRaceParticipants),
}));

export const wagerRaceParticipantRelations = relations(
  wagerRaceParticipants,
  ({ one }) => ({
    race: one(wagerRaces, {
      fields: [wagerRaceParticipants.raceId],
      references: [wagerRaces.id],
    }),
    user: one(users, {
      fields: [wagerRaceParticipants.userId],
      references: [users.id],
    }),
  }),
);

export const supportTicketRelations = relations(supportTickets, ({ one, many }) => ({
  user: one(users, {
    fields: [supportTickets.userId],
    references: [users.id],
  }),
  messages: many(ticketMessages),
}));

export const ticketMessageRelations = relations(ticketMessages, ({ one }) => ({
  ticket: one(supportTickets, {
    fields: [ticketMessages.ticketId],
    references: [supportTickets.id],
  }),
  user: one(users, {
    fields: [ticketMessages.userId],
    references: [users.id],
  }),
}));

// Create schemas for validation
export const insertWheelSpinSchema = createInsertSchema(wheelSpins);
export const selectWheelSpinSchema = createSelectSchema(wheelSpins);
export const insertBonusCodeSchema = createInsertSchema(bonusCodes);
export const selectBonusCodeSchema = createSelectSchema(bonusCodes);
export const insertWagerRaceSchema = createInsertSchema(wagerRaces);
export const selectWagerRaceSchema = createSelectSchema(wagerRaces);
export const insertWagerRaceParticipantSchema = createInsertSchema(wagerRaceParticipants);
export const selectWagerRaceParticipantSchema = createSelectSchema(wagerRaceParticipants);
export const insertSupportTicketSchema = createInsertSchema(supportTickets);
export const selectSupportTicketSchema = createSelectSchema(supportTickets);
export const insertTicketMessageSchema = createInsertSchema(ticketMessages);
export const selectTicketMessageSchema = createSelectSchema(ticketMessages);

// Export types
export type InsertWheelSpin = typeof wheelSpins.$inferInsert;
export type SelectWheelSpin = typeof wheelSpins.$inferSelect;
export type InsertBonusCode = typeof bonusCodes.$inferInsert;
export type SelectBonusCode = typeof bonusCodes.$inferSelect;
export type InsertWagerRace = typeof wagerRaces.$inferInsert;
export type SelectWagerRace = typeof wagerRaces.$inferSelect;
export type InsertWagerRaceParticipant = typeof wagerRaceParticipants.$inferInsert;
export type SelectWagerRaceParticipant = typeof wagerRaceParticipants.$inferSelect;
export type InsertSupportTicket = typeof supportTickets.$inferInsert;
export type SelectSupportTicket = typeof supportTickets.$inferSelect;
export type InsertTicketMessage = typeof ticketMessages.$inferInsert;
export type SelectTicketMessage = typeof ticketMessages.$inferSelect;

export const challenges = pgTable('challenges', {
  id: serial('id').primaryKey(),
  game: text('game').notNull(),
  minBet: text('min_bet').notNull(),
  multiplier: text('multiplier'),
  prizeAmount: text('prize_amount').notNull(),
  maxWinners: integer('max_winners').notNull(),
  timeframe: timestamp('timeframe').notNull(),
  description: text('description'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  createdBy: integer('created_by').references(() => users.id),
  bonusCode: text('bonus_code'),
  source: text('source').default('web'), // 'web' or 'telegram'
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`)
});

export const challengeEntries = pgTable('challenge_entries', {
  id: serial('id').primaryKey(),
  challengeId: integer('challenge_id').notNull().references(() => challenges.id),
  userId: integer('user_id').notNull().references(() => users.id),
  betLink: text('bet_link').notNull(),
  status: text('status').default('pending'),
  bonusCode: text('bonus_code'),
  submittedAt: timestamp('submitted_at').default(sql`CURRENT_TIMESTAMP`),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: integer('verified_by').references(() => users.id),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`)
});

// Define relations
export const challengeRelations = relations(challenges, ({ many, one }) => ({
  entries: many(challengeEntries),
  creator: one(users, {
    fields: [challenges.createdBy],
    references: [users.id],
  })
}));

export const challengeEntriesRelations = relations(challengeEntries, ({ one }) => ({
  challenge: one(challenges, {
    fields: [challengeEntries.challengeId],
    references: [challenges.id],
  }),
  user: one(users, {
    fields: [challengeEntries.userId],
    references: [users.id],
  }),
  verifier: one(users, {
    fields: [challengeEntries.verifiedBy],
    references: [users.id],
  })
}));


export type Challenge = typeof challenges.$inferSelect;
export type ChallengeEntry = typeof challengeEntries.$inferSelect;