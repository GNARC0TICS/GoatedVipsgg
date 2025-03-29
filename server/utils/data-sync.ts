import { db } from "@db/connection";
import { log } from "../vite";
import { affiliateStats } from "@db/schema/affiliate";
import { users } from "@db/schema/tables";
import { sql, eq } from "drizzle-orm";
import { LeaderboardData, LeaderboardEntry, TimePeriod } from "@/types/api";

// Use the TimePeriod type from api.ts
const PERIODS: TimePeriod[] = ['today', 'weekly', 'monthly', 'all_time'];

function getWagerAmount(entry: LeaderboardEntry, period: TimePeriod): number {
  const wagered = entry.wagered;
  if (!wagered) return 0;

  switch (period) {
    case 'today':
      return wagered.today ?? 0;
    case 'weekly':
      return wagered.this_week ?? 0;
    case 'monthly':
      return wagered.this_month ?? 0;
    case 'all_time':
      return wagered.all_time ?? 0;
    default:
      return 0;
  }
}

/**
 * Syncs leaderboard data from the API to our database
 * @param data The leaderboard data from the API
 */
export async function syncLeaderboardData(data: LeaderboardData): Promise<void> {
  try {
    log("Starting leaderboard data sync...");
    
    // Process each time period separately
    for (const period of PERIODS) {
      const periodData = data.data[period];
      if (!periodData?.data) {
        log(`No data available for period: ${period}`);
        continue;
      }

      const entries = periodData.data;
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
          
          // Get the wager amount for this period
          const wageredAmount = getWagerAmount(entry, period);
          
          try {
            // Process affiliate stats
            try {
              // Check if the entry already exists
              const existingEntries = await db
                .select({ id: affiliateStats.id })
                .from(affiliateStats)
                .where(sql`${affiliateStats.uid} = ${entry.uid} AND ${affiliateStats.period} = ${period}`)
                .limit(1);
              
              const existingEntry = existingEntries[0];
              if (existingEntry?.id) {
                // Update existing entry
                await db
                  .update(affiliateStats)
                  .set({ 
                    name,
                    wagered: wageredAmount.toString(), // Convert to string for decimal type
                    updatedAt: new Date() 
                  })
                  .where(sql`${affiliateStats.id} = ${existingEntry.id}`);
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
              // Check if user schema is properly defined
              if ('username' in users && 'password' in users && 'email' in users) {
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
