import { 
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  boolean,
  decimal,
  jsonb,
  varchar
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

// Updated affiliate stats schema to match the leaderboard data
export const affiliateStats = pgTable("affiliate_stats", {
  id: serial("id").primaryKey(),
  uid: varchar("uid", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  wagered: decimal("wagered", { precision: 18, scale: 2 }).notNull(),
  period: varchar("period", { length: 50 }).notNull(), // 'today', 'weekly', 'monthly', 'all_time'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Updated wager races to use string ID instead of serial
export const wagerRaces = pgTable("wager_races", {
  id: varchar("id", { length: 10 }).primaryKey(), // YYYYMM format for monthly races
  status: varchar("status", { length: 20 }).notNull().default("live"), // 'upcoming', 'live', 'completed'
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  prizePool: decimal("prize_pool", { precision: 10, scale: 2 }).notNull().default("500"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Updated participants schema to match the race leaderboard format
export const wagerRaceParticipants = pgTable("wager_race_participants", {
  id: serial("id").primaryKey(),
  raceId: varchar("race_id", { length: 10 }).notNull().references(() => wagerRaces.id),
  uid: varchar("uid", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  wagered: decimal("wagered", { precision: 18, scale: 2 }).notNull(),
  position: integer("position").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const wagerRaceRelations = relations(wagerRaces, ({ many }) => ({
  participants: many(wagerRaceParticipants),
}));

export const wagerRaceParticipantsRelations = relations(wagerRaceParticipants, ({ one }) => ({
  race: one(wagerRaces, {
    fields: [wagerRaceParticipants.raceId],
    references: [wagerRaces.id],
  }),
}));