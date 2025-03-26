import { db } from "@db/connection";
import { eq, sql } from "drizzle-orm";
import { affiliateStats, wagerRaces, wagerRaceParticipants } from "@db/schema/index";
import { log } from "../vite";
import { LeaderboardData } from "./leaderboard-cache";

export async function syncLeaderboardData(data: LeaderboardData) {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const raceId = `${currentYear}${(currentMonth + 1).toString().padStart(2, "0")}`;
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
    const startDate = new Date(currentYear, currentMonth, 1);

    // Begin transaction
    await db.transaction(async (tx) => {
      // Store daily stats
      for (const entry of data.data.today.data) {
        await tx.insert(affiliateStats).values({
          userId: entry.uid,
          totalWager: entry.wagered.today.toString(),
          commission: (entry.wagered.today * 0.1).toString(), // 10% commission rate
          timestamp: new Date()
        }).onConflictDoUpdate({
          target: [affiliateStats.userId],
          set: {
            totalWager: entry.wagered.today.toString(),
            commission: (entry.wagered.today * 0.1).toString(),
            timestamp: new Date()
          }
        });
      }

      // Insert or update race
      await tx.insert(wagerRaces).values({
        id: parseInt(raceId),
        title: `Monthly Wager Race - ${new Date(startDate).toLocaleString('default', {month: 'long'})} ${currentYear}`,
        type: 'monthly',
        status: 'live',
        prizePool: '500',
        startDate,
        endDate: endOfMonth,
        minWager: '0',
        prizeDistribution: { "1": 50, "2": 30, "3": 10, "4": 5, "5": 5 }
      }).onConflictDoUpdate({
        target: [wagerRaces.id],
        set: {
          updatedAt: new Date()
        }
      });

      // Store the top 10 participants
      for (const [index, participant] of data.data.monthly.data.slice(0, 10).entries()) {
        await tx.insert(wagerRaceParticipants).values({
          race_id: parseInt(raceId),
          user_id: parseInt(participant.uid),
          total_wager: participant.wagered.this_month.toString(),
          rank: index + 1,
          joined_at: new Date(),
          updated_at: new Date(),
          wager_history: [{
            timestamp: new Date().toISOString(),
            amount: participant.wagered.this_month
          }]
        }).onConflictDoUpdate({
          target: [wagerRaceParticipants.race_id, wagerRaceParticipants.user_id],
          set: {
            total_wager: participant.wagered.this_month.toString(),
            rank: index + 1,
            updated_at: new Date(),
            wager_history: sql`${wagerRaceParticipants.wager_history} || ${JSON.stringify([{
              timestamp: new Date().toISOString(),
              amount: participant.wagered.this_month
            }])}::jsonb`
          }
        });
      }
    });

    log('Successfully synced leaderboard data to database');
    return true;
  } catch (error) {
    log(`Error syncing leaderboard data: ${error}`);
    return false;
  }
}
