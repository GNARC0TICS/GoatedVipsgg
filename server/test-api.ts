import { log } from "./vite";
import { API_CONFIG } from "./routes";

async function analyzeLeaderboardAPI() {
  try {
    console.log('\n=== Starting API Analysis ===\n');

    // Test API health
    const healthCheck = await fetch(`${API_CONFIG.baseUrl}/health`, {
      headers: {
        'Authorization': `Bearer ${API_CONFIG.token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('API Health Check:', healthCheck.status, healthCheck.statusText);

    // Make leaderboard request
    const response = await fetch(`${API_CONFIG.baseUrl}/referral-leaderboard`, {
      headers: {
        'Authorization': `Bearer ${API_CONFIG.token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('\nResponse Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

    const rawData = await response.json();

    // Basic Structure Analysis
    console.log('\nAPI Response Structure:', {
      success: rawData.success,
      dataType: typeof rawData.data,
      isArray: Array.isArray(rawData.data),
      totalEntries: rawData.data?.length || 0,
      responseKeys: Object.keys(rawData)
    });

    if (Array.isArray(rawData.data) && rawData.data.length > 0) {
      // Data Format Analysis
      const sampleEntry = rawData.data[0];
      console.log('\nSample Entry Structure:', {
        fields: Object.keys(sampleEntry),
        wagerFields: sampleEntry.wagered ? Object.keys(sampleEntry.wagered) : [],
        dataTypes: {
          uid: typeof sampleEntry.uid,
          name: typeof sampleEntry.name,
          wagered: typeof sampleEntry.wagered,
          wagerFields: sampleEntry.wagered ? 
            Object.entries(sampleEntry.wagered).map(([key, value]) => ({
              field: key,
              type: typeof value,
              example: value
            })) : []
        }
      });

      // Statistical Analysis
      const stats = {
        uniqueUsers: new Set(rawData.data.map((entry: any) => entry.uid)).size,
        totalEntries: rawData.data.length,
        wagerStats: {
          allTime: {
            min: Math.min(...rawData.data.map((e: any) => e.wagered.all_time)),
            max: Math.max(...rawData.data.map((e: any) => e.wagered.all_time)),
            avg: rawData.data.reduce((sum: number, e: any) => sum + e.wagered.all_time, 0) / rawData.data.length
          },
          weekly: {
            min: Math.min(...rawData.data.map((e: any) => e.wagered.this_week)),
            max: Math.max(...rawData.data.map((e: any) => e.wagered.this_week)),
            avg: rawData.data.reduce((sum: number, e: any) => sum + e.wagered.this_week, 0) / rawData.data.length
          }
        },
        activeUsers: {
          weekly: rawData.data.filter((e: any) => e.wagered.this_week > 0).length,
          monthly: rawData.data.filter((e: any) => e.wagered.this_month > 0).length,
          allTime: rawData.data.filter((e: any) => e.wagered.all_time > 0).length
        }
      };

      console.log('\nData Statistics:', stats);

      // Sample Top Users
      console.log('\nTop 3 Users by Category:');

      // All-time top users
      console.log('\nTop All-Time Wagers:',
        rawData.data
          .sort((a: any, b: any) => b.wagered.all_time - a.wagered.all_time)
          .slice(0, 3)
          .map((entry: any) => ({
            name: entry.name,
            allTimeWager: entry.wagered.all_time,
            weeklyWager: entry.wagered.this_week
          }))
      );

      // Weekly top users
      console.log('\nTop Weekly Wagers:',
        rawData.data
          .sort((a: any, b: any) => b.wagered.this_week - a.wagered.this_week)
          .slice(0, 3)
          .map((entry: any) => ({
            name: entry.name,
            weeklyWager: entry.wagered.this_week,
            allTimeWager: entry.wagered.all_time
          }))
      );

      // Data format validation
      const validation = {
        hasInvalidUIDs: rawData.data.some((e: any) => !e.uid || typeof e.uid !== 'string'),
        hasInvalidNames: rawData.data.some((e: any) => !e.name || typeof e.name !== 'string'),
        hasInvalidWagers: rawData.data.some((e: any) => !e.wagered || typeof e.wagered !== 'object'),
        wagerFieldsConsistent: rawData.data.every((e: any) => 
          e.wagered && 
          'today' in e.wagered && 
          'this_week' in e.wagered && 
          'this_month' in e.wagered && 
          'all_time' in e.wagered
        )
      };

      console.log('\nData Validation Results:', validation);
    }

  } catch (error) {
    console.error('\nError analyzing API:', error);
  }
}

analyzeLeaderboardAPI();