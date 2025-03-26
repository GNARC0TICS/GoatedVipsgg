import { db } from "@db/connection";
import { eq, sql, and } from "drizzle-orm";
import { log } from "../vite";
import { LeaderboardData, LeaderboardEntry } from "./leaderboard-cache";
import fs from 'fs';
import { affiliateStats } from "@db/schema/affiliate";

interface DbEntry {
  uid: string;
  name: string;
  wagered: string;
  period: string;
  updatedAt: Date;
}

type BatchItem = {
  uid: string;
  [key: string]: any;
};

/**
 * Helper function to split an array into chunks of specified size
 * @param array Array to split
 * @param chunkSize Size of each chunk
 * @returns Array of chunks
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

// Add a function to check if the database connection is active
async function isDatabaseConnectionActive(): Promise<boolean> {
  try {
    // Try to execute a simple query to check connection
    await db.execute(sql`SELECT 1`);
    return true;
  } catch (error) {
    log(`Database connection check failed: ${error}`);
    return false;
  }
}

export async function syncLeaderboardData(data: LeaderboardData): Promise<boolean> {
  try {
    // First, check if the database connection is active
    const isDbActive = await isDatabaseConnectionActive();
    if (!isDbActive) {
      log('Database connection is not active, skipping data sync');
      return false;
    }
    
    // Safely access data with proper null checks
    const todayData = data?.data?.today?.data || [];
    const weeklyData = data?.data?.weekly?.data || [];
    const monthlyData = data?.data?.monthly?.data || [];
    const allTimeData = data?.data?.all_time?.data || [];
    
    log(`Received leaderboard data with ${todayData.length} daily entries, ${weeklyData.length} weekly entries, ${monthlyData.length} monthly entries, and ${allTimeData.length} all-time entries`);
    
    // Calculate commission and update timestamp for metadata
    const now = new Date();
    
    // Store the raw data for debugging and future use
    const metadataKey = `leaderboard_data_${now.toISOString().split('T')[0]}`;
    try {
      // Save the entire data as a JSON file for debugging and backup
      const dataDir = './memory-bank';
      
      try {
        // Create directory if it doesn't exist
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        
        // Write data to file
        fs.writeFileSync(
          `${dataDir}/${metadataKey}.json`,
          JSON.stringify({
            timestamp: now.toISOString(),
            data,
            source: 'goated_api',
            url: process.env.GOATED_API_ENDPOINT || 'https://api.goated.com/user2/affiliate/referral-leaderboard/2RW440E'
          }, null, 2)
        );
        
        log(`Successfully saved raw leaderboard data to ${dataDir}/${metadataKey}.json`);
      } catch (fsError) {
        log(`File system error: ${fsError}`);
      }
    } catch (error) {
      log(`Error saving raw leaderboard data: ${error}`);
    }
    
    // Process and store data in the database - one period at a time to avoid timeout
    try {
      // Define periods and mapping
      type Period = 'today' | 'weekly' | 'monthly' | 'all_time';
      const periods: Period[] = ['today', 'weekly', 'monthly', 'all_time'];
      
      const periodMapping: Record<Period, keyof LeaderboardEntry['wagered']> = {
        'today': 'today', 
        'weekly': 'this_week', 
        'monthly': 'this_month', 
        'all_time': 'all_time'
      };
      
      // Keep track of overall statistics
      let overallProcessed = 0;
      
      // Process each period separately - but process in a specific order to have 
      // consistent data across periods
      for (const period of periods) {
        // Get the correct data for this period from the appropriate property
        const periodData = (() => {
          switch (period) {
            case 'today': return todayData;
            case 'weekly': return weeklyData;
            case 'monthly': return monthlyData;
            case 'all_time': return allTimeData;
            default: return [];
          }
        })();
        
        // Skip if no data for this period
        if (!periodData || periodData.length === 0) {
          log(`No data for period ${period}, skipping`);
          continue;
        }
        
        // Prepare entries for processing
        const dbEntries: DbEntry[] = periodData.map((entry: LeaderboardEntry) => {
          // Using an explicit property access for each period to ensure type safety
          let wageredAmount = '0';
          if (entry.wagered) {
            switch(period) {
              case 'today': 
                wageredAmount = entry.wagered.today ? entry.wagered.today.toString() : '0';
                break;
              case 'weekly': 
                wageredAmount = entry.wagered.this_week ? entry.wagered.this_week.toString() : '0';
                break;
              case 'monthly': 
                wageredAmount = entry.wagered.this_month ? entry.wagered.this_month.toString() : '0';
                break;
              case 'all_time': 
                wageredAmount = entry.wagered.all_time ? entry.wagered.all_time.toString() : '0';
                break;
              default:
                wageredAmount = '0';
            }
          }
          
          return {
            uid: entry.uid || 'unknown',
            name: entry.name || 'Unknown',
            wagered: wageredAmount,
            period: period,
            updatedAt: now
          };
        });
        
        // Create small batches to avoid timeout
        const BATCH_SIZE = 50; // Smaller batch size to avoid timeouts
        const batches = chunkArray<DbEntry>(dbEntries, BATCH_SIZE);
        
        log(`Processing ${dbEntries.length} entries for period "${period}" in ${batches.length} batches`);
        
        // Get existing UIDs for this period
        const existingEntries = await db.select({ uid: affiliateStats.uid })
          .from(affiliateStats)
          .where(eq(affiliateStats.period, period));
          
        const existingUids = new Set(existingEntries.map(e => e.uid));
        
        // Process each batch
        let totalInserted = 0;
        let totalUpdated = 0;
        
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          
          try {
            // Check database connection before each batch
            const isActive = await isDatabaseConnectionActive();
            if (!isActive) {
              log(`Database connection lost during batch ${i+1}/${batches.length} for period ${period}, skipping remaining batches`);
              break; // Exit the batch loop if connection is lost
            }
            
            // Split into entries to insert and update
            const entriesToInsert = batch.filter(e => !existingUids.has(e.uid));
            const entriesToUpdate = batch.filter(e => existingUids.has(e.uid));
            
            // Batch insert new entries
            if (entriesToInsert.length > 0) {
              await db.insert(affiliateStats).values(entriesToInsert);
              totalInserted += entriesToInsert.length;
              
              // Add new UIDs to the set for subsequent batches
              entriesToInsert.forEach(e => existingUids.add(e.uid));
            }
            
            // Update existing entries - in mini-batches to avoid timeout
            const updateBatchSize = 10;
            const updateBatches = chunkArray<DbEntry>(entriesToUpdate, updateBatchSize);
            
            for (const updateBatch of updateBatches) {
              // Check database connection before each update batch
              const isUpdateBatchActive = await isDatabaseConnectionActive();
              if (!isUpdateBatchActive) {
                log(`Database connection lost during update batch for period ${period}, skipping remaining updates`);
                break; // Exit the update batch loop if connection is lost
              }
              
              for (const entry of updateBatch) {
                try {
                  await db.update(affiliateStats)
                    .set({ 
                      name: entry.name,
                      wagered: entry.wagered,
                      updatedAt: entry.updatedAt
                    })
                    .where(
                      and(
                        eq(affiliateStats.uid, entry.uid),
                        eq(affiliateStats.period, period)
                      )
                    );
                  totalUpdated++;
                } catch (error: any) {
                  log(`Error updating entry for UID ${entry.uid} in period ${period}: ${error}`);
                  
                  // Check if this is a connection error and break if needed
                  const errorStr = String(error);
                  if (errorStr.includes("Cannot use a pool after calling end") || 
                      errorStr.includes("connection") || 
                      errorStr.includes("pool")) {
                    log(`Database connection error detected, stopping update process`);
                    break;
                  }
                }
              }
            }
            
            log(`Processed batch ${i+1}/${batches.length} for period "${period}"`);
          } catch (batchError) {
            log(`Error processing batch ${i+1}/${batches.length} for period ${period}: ${batchError}`);
          }
        }
        
        log(`Period "${period}": Inserted ${totalInserted} new entries, updated ${totalUpdated} existing entries`);
        overallProcessed += totalInserted + totalUpdated;
      }
      
      log(`Successfully processed ${overallProcessed} total entries across all periods`);
    } catch (dbError) {
      log(`Database error during sync: ${dbError}`);
    }
    
    log('Successfully processed leaderboard data');
    return true;
  } catch (error) {
    log(`Error syncing leaderboard data: ${error}`);
    return false;
  }
}
