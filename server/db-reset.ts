import { db } from "../db";
import {
  users,
  affiliateStats,
  wagerRaces,
  wagerRaceParticipants,
  notificationPreferences,
} from "../db/schema";
import { sql } from "drizzle-orm";
import { log } from "./vite";
import { API_CONFIG } from "./config/api";

async function resetDatabase() {
  try {
    // Drop all tables
    await db.execute(sql`
      TRUNCATE TABLE affiliate_stats, wager_race_participants, wager_races, 
      notification_preferences, users CASCADE;
    `);

    log("Database tables cleared");

    // Fetch data from external API
    const response = await fetch(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.API_TOKEN || API_CONFIG.token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const apiData = await response.json();
    const users_data = apiData.data || apiData.results || apiData;

    // Create sample wager race

  // Create platform_stats table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS platform_stats (
      id SERIAL PRIMARY KEY,
      total_wagered DECIMAL(18,2) NOT NULL,
      daily_total DECIMAL(18,2) NOT NULL,
      weekly_total DECIMAL(18,2) NOT NULL, 
      monthly_total DECIMAL(18,2) NOT NULL,
      player_count INTEGER NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

    const [currentRace] = await db
      .insert(wagerRaces)
      .values({
        title: "Weekly Wager Race",
        type: "weekly",
        status: "live",
        prizePool: "1000.00",
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        minWager: "10.00",
        prizeDistribution: { "1": 50, "2": 30, "3": 20 },
        rules: "Compete for the highest wager amount in 7 days",
        description: "Weekly competition for top wagerers",
      })
      .returning();

    // Create new entries
    for (const entry of users_data) {
      // Insert user
      const [user] = await db
        .insert(users)
        .values({
          username: entry.name,
          email: `${entry.name.toLowerCase()}@placeholder.com`,
          password: "placeholder",
          isAdmin: false,
          createdAt: new Date(),
        })
        .returning();

      // Insert affiliate stats
      await db.insert(affiliateStats).values({
        user_id: user.id,
        total_wager: entry.wagered.all_time || "0",
        commission: "0",
        timestamp: new Date(),
      });

      // Insert race participant data
      await db.insert(wagerRaceParticipants).values({
        race_id: currentRace.id,
        user_id: user.id,
        total_wager: entry.wagered.weekly || "0",
        rank: null,
        wager_history: [],
        joined_at: new Date(),
        updated_at: new Date()
      });

      // Insert default notification preferences
      await db.insert(notificationPreferences).values({
        userId: user.id,
        wagerRaceUpdates: true,
        vipStatusChanges: true,
        promotionalOffers: true,
        monthlyStatements: true,
        emailNotifications: true,
        pushNotifications: true,
      });
    }

    log("Database reset complete with new data");
  } catch (error) {
    log(`Error resetting database: ${error}`);
    throw error;
  }
}

resetDatabase();