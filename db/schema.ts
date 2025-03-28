import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  boolean,
  decimal,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import {
  challenges,
  challengeEntries,
  telegramBotState,
  telegramUsers,
  verificationRequests,
} from "./schema/telegram";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  email: text("email").unique().notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login"),
  lastLoginIp: text("last_login_ip"),

  // Profile customization fields
  bio: text("bio"),
  profileColor: text("profile_color"),

  // Goated.com account linking fields
  goatedUid: text("goated_uid").unique(),
  goatedUsername: text("goated_username"),
  isGoatedVerified: boolean("is_goated_verified").default(false),
  goatedVerifiedAt: timestamp("goated_verified_at"),

  // Telegram account linking fields
  telegramId: text("telegram_id").unique(),
  telegramUsername: text("telegram_username"),
  isTelegramVerified: boolean("is_telegram_verified").default(false),
  telegramVerifiedAt: timestamp("telegram_verified_at"),
});

// User sessions table for tracking login sessions
export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  sessionToken: text("session_token").notNull().unique(),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  lastActive: timestamp("last_active").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User activity log
export const userActivityLog = pgTable("user_activity_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  rules: text("rules"),
  description: text("description"),
});

export const wagerRaceParticipants = pgTable("wager_race_participants", {
  id: serial("id").primaryKey(),
  race_id: integer("race_id").references(() => wagerRaces.id),
  user_id: integer("user_id").references(() => users.id),
  total_wager: decimal("total_wager", { precision: 18, scale: 2 }).notNull(),
  rank: integer("rank"),
  joined_at: timestamp("joined_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  wager_history: jsonb("wager_history"), // Track wager progress over time
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
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
  userId: integer("user_id").references(() => users.id),
  totalWager: decimal("total_wager", { precision: 18, scale: 8 }).notNull(),
  commission: decimal("commission", { precision: 18, scale: 8 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  // Leaderboard data fields
  uid: text("uid"),
  name: text("name"),
  wagered: decimal("wagered", { precision: 18, scale: 2 }),
  period: text("period"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const affiliateStatsRelations = relations(affiliateStats, ({ one }) => ({
  user: one(users, {
    fields: [affiliateStats.userId],
    references: [users.id],
  }),
}));

// New tables for additional features

export const bonusCodes = pgTable("bonus_codes", {
  id: serial("id").primaryKey(),
  code: text("code").unique().notNull(),
  description: text("description").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expired: boolean("expired").default(false).notNull(),
  createdBy: integer("created_by").references(() => users.id),
});

export const newsletterSubscriptions = pgTable("newsletter_subscriptions", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  isSubscribed: boolean("is_subscribed").default(true).notNull(),
  subscribedAt: timestamp("subscribed_at").defaultNow().notNull(),
  unsubscribedAt: timestamp("unsubscribed_at"),
  source: text("source"), // Track where the subscription came from
});

export const historicalRaces = pgTable("historical_races", {
  id: serial("id").primaryKey(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  prizePool: decimal("prize_pool", { precision: 10, scale: 2 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  participants: jsonb("participants").notNull(), // Store all participants
  totalWagered: decimal("total_wagered", { precision: 18, scale: 2 }).notNull(),
  participantCount: integer("participant_count").notNull(),
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  metadata: jsonb("metadata").default({}).notNull(), // For future extensibility
});

// Account verification request tables
export const goatedVerificationRequests = pgTable(
  "goated_verification_requests",
  {
    id: serial("id").primaryKey(),
    platformUserId: integer("platform_user_id")
      .references(() => users.id)
      .notNull(),
    goatedUsername: text("goated_username").notNull(),
    goatedUid: text("goated_uid").notNull(),
    requestedAt: timestamp("requested_at").defaultNow().notNull(),
    status: text("status").default("pending").notNull(),
    adminNotes: text("admin_notes"),
    verifiedAt: timestamp("verified_at"),
    verifiedBy: integer("verified_by").references(() => users.id),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
);

export const telegramVerificationRequests = pgTable(
  "telegram_verification_requests",
  {
    id: serial("id").primaryKey(),
    platformUserId: integer("platform_user_id")
      .references(() => users.id)
      .notNull(),
    telegramId: text("telegram_id").notNull(),
    telegramUsername: text("telegram_username"),
    requestedAt: timestamp("requested_at").defaultNow().notNull(),
    status: text("status").default("pending").notNull(),
    adminNotes: text("admin_notes"),
    verifiedAt: timestamp("verified_at"),
    verifiedBy: integer("verified_by").references(() => users.id),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
);

export const userRelations = relations(users, ({ one, many }) => ({
  preferences: one(notificationPreferences, {
    fields: [users.id],
    references: [notificationPreferences.userId],
  }),
  createdRaces: many(wagerRaces),
  raceParticipations: many(wagerRaceParticipants),
  // New relations for account linking
  goatedVerifications: many(goatedVerificationRequests),
  telegramVerifications: many(telegramVerificationRequests),
  // Session and activity tracking
  sessions: many(userSessions),
  activityLogs: many(userActivityLog),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const userActivityLogRelations = relations(userActivityLog, ({ one }) => ({
  user: one(users, {
    fields: [userActivityLog.userId],
    references: [users.id],
  }),
}));

export const wagerRaceRelations = relations(wagerRaces, ({ one, many }) => ({
  creator: one(users, {
    fields: [wagerRaces.createdBy],
    references: [users.id],
  }),
  participants: many(wagerRaceParticipants),
}));

// Verification request relations
export const goatedVerificationRequestRelations = relations(
  goatedVerificationRequests,
  ({ one }) => ({
    user: one(users, {
      fields: [goatedVerificationRequests.platformUserId],
      references: [users.id],
    }),
    verifier: one(users, {
      fields: [goatedVerificationRequests.verifiedBy],
      references: [users.id],
      relationName: "goatedVerifier",
    }),
  }),
);

export const telegramVerificationRequestRelations = relations(
  telegramVerificationRequests,
  ({ one }) => ({
    user: one(users, {
      fields: [telegramVerificationRequests.platformUserId],
      references: [users.id],
    }),
    verifier: one(users, {
      fields: [telegramVerificationRequests.verifiedBy],
      references: [users.id],
      relationName: "telegramVerifier",
    }),
  }),
);

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertNotificationPreferencesSchema = createInsertSchema(
  notificationPreferences,
);
export const selectNotificationPreferencesSchema = createSelectSchema(
  notificationPreferences,
);
export const insertWagerRaceSchema = createInsertSchema(wagerRaces);
export const selectWagerRaceSchema = createSelectSchema(wagerRaces);
export const insertWagerRaceParticipantSchema = createInsertSchema(
  wagerRaceParticipants,
);
export const selectWagerRaceParticipantSchema = createSelectSchema(
  wagerRaceParticipants,
);
export const insertNewsletterSubscriptionSchema = createInsertSchema(
  newsletterSubscriptions,
);
export const selectNewsletterSubscriptionSchema = createSelectSchema(
  newsletterSubscriptions,
);

export const insertHistoricalRaceSchema = createInsertSchema(historicalRaces);
export const selectHistoricalRaceSchema = createSelectSchema(historicalRaces);

// Verification request schemas
export const insertGoatedVerificationRequestSchema = createInsertSchema(
  goatedVerificationRequests,
);
export const selectGoatedVerificationRequestSchema = createSelectSchema(
  goatedVerificationRequests,
);
export const insertTelegramVerificationRequestSchema = createInsertSchema(
  telegramVerificationRequests,
);
export const selectTelegramVerificationRequestSchema = createSelectSchema(
  telegramVerificationRequests,
);

export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertNotificationPreferences =
  typeof notificationPreferences.$inferInsert;
export type SelectNotificationPreferences =
  typeof notificationPreferences.$inferSelect;
export type InsertWagerRace = typeof wagerRaces.$inferInsert;
export type SelectWagerRace = typeof wagerRaces.$inferSelect;
export type InsertWagerRaceParticipant =
  typeof wagerRaceParticipants.$inferInsert;
export type SelectWagerRaceParticipant =
  typeof wagerRaceParticipants.$inferSelect;
export type InsertNewsletterSubscription =
  typeof newsletterSubscriptions.$inferInsert;
export type SelectNewsletterSubscription =
  typeof newsletterSubscriptions.$inferSelect;

export type InsertHistoricalRace = typeof historicalRaces.$inferInsert;
export type SelectHistoricalRace = typeof historicalRaces.$inferSelect;

// User session and activity types
export type InsertUserSession = typeof userSessions.$inferInsert;
export type SelectUserSession = typeof userSessions.$inferSelect;
export type InsertUserActivityLog = typeof userActivityLog.$inferInsert;
export type SelectUserActivityLog = typeof userActivityLog.$inferSelect;

// Verification request types
export type InsertGoatedVerificationRequest =
  typeof goatedVerificationRequests.$inferInsert;
export type SelectGoatedVerificationRequest =
  typeof goatedVerificationRequests.$inferSelect;
export type InsertTelegramVerificationRequest =
  typeof telegramVerificationRequests.$inferInsert;
export type SelectTelegramVerificationRequest =
  typeof telegramVerificationRequests.$inferSelect;

// Export necessary variables and schemas
export {
  challenges,
  challengeEntries,
  telegramBotState,
  telegramUsers,
  verificationRequests,
};
