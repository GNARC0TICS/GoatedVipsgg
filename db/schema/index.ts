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
import { relations } from "drizzle-orm";
import {
  apiKeys,
  apiKeyUsage,
  usedNonces,
  securityEvents,
  apiKeyRelations,
} from "./api-keys";

// Export all tables
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  email: text("email").unique().notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login"),
  lastLoginIp: text("last_login_ip"),
  bio: text("bio"),
  profileColor: text("profile_color"),
  goatedUid: text("goated_uid").unique(),
  goatedUsername: text("goated_username"),
  isGoatedVerified: boolean("is_goated_verified").default(false),
  goatedVerifiedAt: timestamp("goated_verified_at"),
  telegramId: text("telegram_id").unique(),
  telegramUsername: text("telegram_username"),
  isTelegramVerified: boolean("is_telegram_verified").default(false),
  telegramVerifiedAt: timestamp("telegram_verified_at"),
});

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
  type: text("type").notNull(),
  status: text("status").notNull(),
  prizePool: decimal("prize_pool", { precision: 18, scale: 2 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  minWager: decimal("min_wager", { precision: 18, scale: 2 }).notNull(),
  prizeDistribution: jsonb("prize_distribution").notNull(),
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
  wager_history: jsonb("wager_history"),
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
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
});

// Relations
export const userRelations = relations(users, ({ one, many }) => ({
  preferences: one(notificationPreferences, {
    fields: [users.id],
    references: [notificationPreferences.userId],
  }),
  createdRaces: many(wagerRaces),
  raceParticipations: many(wagerRaceParticipants),
  sessions: many(userSessions),
  activityLogs: many(userActivityLog),
}));

export const wagerRaceRelations = relations(wagerRaces, ({ one, many }) => ({
  creator: one(users, {
    fields: [wagerRaces.createdBy],
    references: [users.id],
  }),
  participants: many(wagerRaceParticipants),
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

// Export API key related schemas
export {
  apiKeys,
  apiKeyUsage,
  usedNonces,
  securityEvents,
  apiKeyRelations,
};

export const affiliateStatsRelations = relations(affiliateStats, ({ one }) => ({
  user: one(users, {
    fields: [affiliateStats.userId],
    references: [users.id],
  }),
}));
