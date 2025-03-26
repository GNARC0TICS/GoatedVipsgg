
import { db } from "@db";
import { affiliateStats, wagerRaceParticipants } from "@db/schema";
import { log } from "../vite";

export async function syncExternalData() {
  try {
    const response = await fetch(process.env.EXTERNAL_API_URL!, {
      headers: {
        Authorization: `Bearer ${process.env.API_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const data = await response.json();

    // Begin transaction
    await db.transaction(async (tx) => {
      for (const user of data.data.all_time.data) {
        // Update affiliate stats
        await tx.insert(affiliateStats).values({
          userId: user.uid,
          totalWager: user.wagered.all_time,
          commission: 0, // Calculate commission based on your rules
          timestamp: new Date()
        });

        // Update race participants if in active race
        await tx.insert(wagerRaceParticipants).values({
          uid: user.uid,
          name: user.name,
          wagered: user.wagered.this_month,
          position: 0 // Will be updated after sorting
        });
      }
    });

    log("External data sync completed successfully");
  } catch (error) {
    log(`Error syncing external data: ${error}`);
    throw error;
  }
}
