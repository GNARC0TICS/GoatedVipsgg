import { db } from "../../db/connection";
import { log } from "../vite";
import { affiliateStats } from "../../db/schema/affiliate";
import { users } from "../../db/schema";
import { sql, eq } from "drizzle-orm";

/**
 * Type definition for leaderboard data from API
 */
export interface LeaderboardData {
  data: {
    today: { data: LeaderboardEntry[] };
    weekly: { data: LeaderboardEntry[] };
    monthly: { data: LeaderboardEntry[] };
    all_time: { data: LeaderboardEntry[] };
  };
}

/**
 * Type definition for leaderboard entry
 */
export interface LeaderboardEntry {
  uid: string;
  name: string;
  wagered: {
    today: number;
    this_week: number;
    this_month: number;
    all_time: number;
  };
}

/**
 * Syncs leaderboard data from the API to our database
 * @param data The leaderboard data from the API
 */
export async function syncLeaderboardData(data: LeaderboardData): Promise<void> {
  try {
    log("Starting leaderboard data sync...");
    
    // Process each time period separately
    const periods = ['today', 'weekly', 'monthly', 'all_time'] as const;
    
    for (const period of periods) {
      const entries = data.data[period]?.data || [];
      
      if (entries.length === 0) {
        log(`No entries for period: ${period}`);
        continue;
      }
      
      log(`Syncing ${entries.length} entries for period: ${period}`);
      
      // Batch process the entries
      const batchSize = 50;
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        
        // Process each entry
        for (const entry of batch) {
          // Skip entries with invalid UIDs
          if (!entry.uid) {
            continue;
          }
          
          // Default the name if missing
          const name = entry.name || 'Unknown Player';
          
          // Get the appropriate wager value based on period
          let wageredAmount;
          switch (period) {
            case 'today':
              wageredAmount = entry.wagered.today;
              break;
            case 'weekly':
              wageredAmount = entry.wagered.this_week;
              break;
            case 'monthly':
              wageredAmount = entry.wagered.this_month;
              break;
            case 'all_time':
              wageredAmount = entry.wagered.all_time;
              break;
            default:
              wageredAmount = 0;
          }

          // Store all wager amounts for this entry
          const wagerData = {
            today: entry.wagered.today,
            this_week: entry.wagered.this_week,
            this_month: entry.wagered.this_month,
            all_time: entry.wagered.all_time
          };
          
          try {
            // Process affiliate stats
            try {
              // Check if the entry already exists
              const existingEntries = await db
                .select({ id: affiliateStats.id })
                .from(affiliateStats)
                .where(sql`${affiliateStats.uid} = ${entry.uid} AND ${affiliateStats.period} = ${period}`)
                .limit(1);
              
              if (existingEntries.length > 0) {
                // Update existing entry
                await db
                  .update(affiliateStats)
                  .set({ 
                    name,
                    wagered: wageredAmount.toString(), // Convert to string for decimal type
                    updatedAt: new Date() 
                  })
                  .where(sql`${affiliateStats.id} = ${existingEntries[0].id}`);
              } else {
                // Insert new entry
                await db
                  .insert(affiliateStats)
                  .values({
                    uid: entry.uid,
                    name,
                    wagered: wageredAmount.toString(), // Convert to string for decimal type
                    period,
                    createdAt: new Date(),
                    updatedAt: new Date()
                  });
              }
            } catch (statError) {
              log(`Error processing affiliate stats for ${entry.uid}: ${statError}`);
            }
            
            // Process user data if that schema is available
            try {
              // Check if users table has required columns
              if (users.username && users.password && users.email) {
                // Check if user exists
                const existingUsers = await db
                  .select({ id: users.id })
                  .from(users)
                  .where(eq(users.username, name))
                  .limit(1);
                
                if (existingUsers.length === 0) {
                  // Create user with minimum required fields
                  // Generate a random password and email since they're required
                  const randomPassword = Math.random().toString(36).slice(-10);
                  const randomEmail = `${name.toLowerCase().replace(/\s+/g, '.')}_${Math.floor(Math.random() * 10000)}@placeholder.com`;
                  
                  await db
                    .insert(users)
                    .values({
                      username: name,
                      password: randomPassword,
                      email: randomEmail,
                      isAdmin: false,
                      createdAt: new Date(),
                    });
                }
              }
            } catch (userError) {
              // Skip user creation if there's an error or schema mismatch
              log(`Unable to create user for ${name}: ${userError}`);
            }
          } catch (entryError) {
            log(`Error processing entry ${entry.uid}: ${entryError}`);
            // Continue processing other entries even if one fails
          }
        }
        
        log(`Processed batch ${i / batchSize + 1} of ${Math.ceil(entries.length / batchSize)} for period ${period}`);
      }
    }
    
    log("Leaderboard data sync completed successfully");
  } catch (error) {
    log(`Error syncing leaderboard data: ${error}`);
    throw error;
  }
}