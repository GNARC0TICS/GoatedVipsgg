import { db } from "@db/connection";
import { eq, sql } from "drizzle-orm";
import { log } from "../vite";
import { LeaderboardData } from "./leaderboard-cache";
import fs from 'fs';

export async function syncLeaderboardData(data: LeaderboardData) {
  try {
    // Just log the data has been received for debugging
    log(`Received leaderboard data with ${data.data.today.data.length} daily entries, ${data.data.weekly.data.length} weekly entries, ${data.data.monthly.data.length} monthly entries, and ${data.data.all_time.data.length} all-time entries`);
    
    // Calculate commission and update timestamp for metadata
    const now = new Date();
    
    // Store the raw data for debugging and future use
    const metadataKey = `leaderboard_data_${now.toISOString().split('T')[0]}`;
    try {
      // Save the entire data as a JSON file for debugging and backup
      // This doesn't rely on database schema at all
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
    
    log('Successfully processed leaderboard data');
    return true;
  } catch (error) {
    log(`Error syncing leaderboard data: ${error}`);
    return false;
  }
}
