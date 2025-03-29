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

    // Fetch data from external API with updated endpoint for Goated.com
    const response = await fetch(
      "https://api.goated.com/user2/affiliate/referral-leaderboard/2RW440E",
      {
        headers: {
          Authorization: `Bearer ${process.env.API_TOKEN || API_CONFIG.token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const apiData = await response.json();
    log(`Received data with ${apiData.data.today?.data?.length || 0} users`);
    
    // Extract users from today's data
    const users_data = apiData.data?.today?.data || [];

    // Create sample wager race
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
      
    console.log(`Created race with ID: ${currentRace.id}`);

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

      // Define mapping for period names
      const periodMappings = [
        { apiField: "today", dbField: "today" },
        { apiField: "this_week", dbField: "weekly" },
        { apiField: "this_month", dbField: "monthly" },
        { apiField: "all_time", dbField: "all_time" }
      ];

      // Insert affiliate stats using the main schema definition
      await db.insert(affiliateStats).values({
        userId: user.id,
        totalWager: entry.wagered.all_time.toString() || "0",
        commission: "0",
        timestamp: new Date(),
      });

      // Insert race participant data with the correct schema
      await db.insert(wagerRaceParticipants).values({
        race_id: currentRace.id,
        user_id: user.id,
        total_wager: entry.wagered.this_week?.toString() || "0",
        rank: null,
        joined_at: new Date(),
        updated_at: new Date(), 
        wager_history: []
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
