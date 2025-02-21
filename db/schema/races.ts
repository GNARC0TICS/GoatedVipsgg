import { pgTable, serial, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "../schema";

export const historicalRaces = pgTable('historical_races', {
  id: serial('id').primaryKey(),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  prizePool: integer('prize_pool').notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  participants: jsonb('participants').notNull().$type<{
    uid: string;
    name: string;
    wagered: number;
    allTimeWagered: number;
    tier: string;
    prize: string;
    position: number;
    timestamp: string;
  }[]>(),
  totalWagered: integer('total_wagered').notNull(),
  participantCount: integer('participant_count').notNull(),
  status: text('status').notNull(),
  metadata: jsonb('metadata').$type<{
    transitionEnds: string;
    nextRaceStarts: string;
    prizeDistribution: number[];
  }>(),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`)
});
