import { db } from "../db";
import {
  users,
  affiliateStats,
  wagerRaces,
  wagerRaceParticipants,
  notificationPreferences,
} from "../db/schema.js";
import { sql } from "drizzle-orm";
import { log } from "./vite.js";
import { API_CONFIG } from "./config/api.js";

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

    // Create new entries
    for (const entry of users_data) {
      // Insert user with API uid as id
      const [user] = await db
        .insert(users)
        .values({
          id: parseInt(entry.uid, 36) % 2147483647, // Convert uid to int32
          username: entry.name,
          email: `${entry.name.toLowerCase()}@placeholder.com`,
          password: "placeholder",
          isAdmin: false,
          createdAt: new Date(),
        })
        .returning();

      // Insert affiliate stats with API uid and name
      await db.insert(affiliateStats).values({
        id: parseInt(entry.uid, 36) % 2147483647, // Convert uid to int32
        userId: user.id,
        totalWager: entry.wagered.all_time || 0,
        commission: 0,
        timestamp: new Date(),
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