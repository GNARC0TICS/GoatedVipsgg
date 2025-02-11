import {
  pgTable,
  text,
  serial,
  timestamp,
  boolean,
  decimal,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
  userId: integer("user_id").references(() => users.id),
  claimedAt: timestamp("claimed_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false).notNull(),
});

export const ticketMessages = pgTable("ticket_messages", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isStaffReply: boolean("is_staff_reply").default(false).notNull(),
});

export const newsletterSubscriptions = pgTable("newsletter_subscriptions", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  isSubscribed: boolean("is_subscribed").default(true).notNull(),
  subscribedAt: timestamp("subscribed_at").defaultNow().notNull(),
  unsubscribedAt: timestamp("unsubscribed_at"),
  source: text("source"),
});

export const historicalRaces = pgTable("historical_races", {
  id: serial("id").primaryKey(),
  month: text("month").notNull(),
  year: text("year").notNull(),
  prizePool: decimal("prize_pool", { precision: 10, scale: 2 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  participants: jsonb("participants").notNull(),
  totalWagered: decimal("total_wagered", { precision: 18, scale: 2 }).notNull(),
  participantCount: text("participant_count").notNull(),
  status: text("status").notNull().default('completed'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  metadata: jsonb("metadata").default({}).notNull()
});

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
  totalWager: decimal("total_wager", { precision: 18, scale: 2 }).notNull(),
  rank: integer("rank"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  wagerHistory: jsonb("wager_history"), // Track wager progress over time
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  wagerRaceUpdates: boolean("wager_race_updates").default(true).notNull(),
  vipStatusChanges: boolean("vip_status_changes").default(true).notNull(),
  promotionalOffers: boolean("promotional_offers").default(true).notNull(),
  monthlyStatements: boolean("monthly_statements").default(true).notNull(),
  emailNotifications: boolean("email_notifications").default(true).notNull(),
  pushNotifications: boolean("push_notifications").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const affiliateStats = pgTable("affiliate_stats", {
  id: serial("id").primaryKey(),
  totalWager: decimal("total_wager", { precision: 18, scale: 8 }).notNull(),
  commission: decimal("commission", { precision: 18, scale: 8 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"), // 'open' | 'in_progress' | 'closed'
  priority: text("priority").notNull().default("medium"), // 'low' | 'medium' | 'high'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Schema type definitions
export const insertTicketMessageSchema = createInsertSchema(ticketMessages);
export const selectTicketMessageSchema = createSelectSchema(ticketMessages);
export const insertNewsletterSubscriptionSchema = createInsertSchema(
  newsletterSubscriptions,
);
export const selectNewsletterSubscriptionSchema = createSelectSchema(
  newsletterSubscriptions,
);
export const insertHistoricalRaceSchema = createInsertSchema(historicalRaces);
export const selectHistoricalRaceSchema = createSelectSchema(historicalRaces);
export const insertWagerRaceSchema = createInsertSchema(wagerRaces);
export const selectWagerRaceSchema = createSelectSchema(wagerRaces);
export const insertWagerRaceParticipantSchema = createInsertSchema(
  wagerRaceParticipants,
);
export const selectWagerRaceParticipantSchema = createSelectSchema(
  wagerRaceParticipants,
);
export const insertSupportTicketSchema = createInsertSchema(supportTickets);
export const selectSupportTicketSchema = createSelectSchema(supportTickets);
export const insertAffiliateStatsSchema = createInsertSchema(affiliateStats);
export const selectAffiliateStatsSchema = createSelectSchema(affiliateStats);
export const insertWheelSpinSchema = createInsertSchema(wheelSpins);
export const selectWheelSpinSchema = createSelectSchema(wheelSpins);
export const insertBonusCodeSchema = createInsertSchema(bonusCodes);
export const selectBonusCodeSchema = createSelectSchema(bonusCodes);
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);


// TypeScript type definitions
export type InsertTicketMessage = typeof ticketMessages.$inferInsert;
export type SelectTicketMessage = typeof ticketMessages.$inferSelect;
export type InsertNewsletterSubscription = typeof newsletterSubscriptions.$inferInsert;
export type SelectNewsletterSubscription = typeof newsletterSubscriptions.$inferSelect;
export type InsertHistoricalRace = typeof historicalRaces.$inferInsert;
export type SelectHistoricalRace = typeof historicalRaces.$inferSelect;
export type InsertWagerRace = typeof wagerRaces.$inferInsert;
export type SelectWagerRace = typeof wagerRaces.$inferSelect;
export type InsertWagerRaceParticipant = typeof wagerRaceParticipants.$inferInsert;
export type SelectWagerRaceParticipant = typeof wagerRaceParticipants.$inferSelect;
export type InsertSupportTicket = typeof supportTickets.$inferInsert;
export type SelectSupportTicket = typeof supportTickets.$inferSelect;
export type InsertAffiliateStats = typeof affiliateStats.$inferInsert;
export type SelectAffiliateStats = typeof affiliateStats.$inferSelect;
export type InsertWheelSpin = typeof wheelSpins.$inferInsert;
export type SelectWheelSpin = typeof wheelSpins.$inferSelect;
export type InsertBonusCode = typeof bonusCodes.$inferInsert;
export type SelectBonusCode = typeof bonusCodes.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;

export const wagerRaceRelations = relations(wagerRaces, ({ many }) => ({
  participants: many(wagerRaceParticipants),
}));

export const supportTicketRelations = relations(
  supportTickets,
  ({ one, many }) => ({
    messages: many(ticketMessages),
  }),
);

export const wheelSpinRelations = relations(wheelSpins, ({ one }) => ({
  user: one(users, {
    fields: [wheelSpins.userId],
    references: [users.id],
  }),
}));

export const bonusCodeRelations = relations(bonusCodes, ({ one }) => ({
  user: one(users, {
    fields: [bonusCodes.userId],
    references: [users.id],
  }),
}));