import { pgTable, text, serial, integer, timestamp, boolean, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  email: text("email").unique().notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wagerRaces = pgTable("wager_races", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type", { enum: ['weekly', 'monthly', 'weekend'] }).notNull(),
  status: text("status", { enum: ['upcoming', 'live', 'completed'] }).notNull(),
  prizePool: decimal("prize_pool", { precision: 18, scale: 2 }).notNull(),
  minWager: decimal("min_wager", { precision: 18, scale: 2 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  prizeDistribution: jsonb("prize_distribution").notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const wagerRaceParticipants = pgTable("wager_race_participants", {
  id: serial("id").primaryKey(),
  raceId: integer("race_id").references(() => wagerRaces.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  totalWager: decimal("total_wager", { precision: 18, scale: 2 }).notNull(),
  rank: integer("rank"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const userRelations = relations(users, ({ many }) => ({
  createdRaces: many(wagerRaces),
  raceParticipations: many(wagerRaceParticipants),
}));

export const wagerRaceRelations = relations(wagerRaces, ({ one, many }) => ({
  creator: one(users, {
    fields: [wagerRaces.createdBy],
    references: [users.id],
  }),
  participants: many(wagerRaceParticipants),
}));

// Schema validation and types
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertWagerRaceSchema = createInsertSchema(wagerRaces);
export const selectWagerRaceSchema = createSelectSchema(wagerRaces);
export const insertWagerRaceParticipantSchema = createInsertSchema(wagerRaceParticipants);
export const selectWagerRaceParticipantSchema = createSelectSchema(wagerRaceParticipants);

export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertWagerRace = typeof wagerRaces.$inferInsert;
export type SelectWagerRace = typeof wagerRaces.$inferSelect;
export type InsertWagerRaceParticipant = typeof wagerRaceParticipants.$inferInsert;
export type SelectWagerRaceParticipant = typeof wagerRaceParticipants.$inferSelect;