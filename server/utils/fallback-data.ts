import { LeaderboardData } from "./leaderboard-cache";

/**
 * Creates enhanced fallback data with sample entries for better UX
 * @returns Enhanced fallback leaderboard data
 */
export function createEnhancedFallbackData(): LeaderboardData {
  // Generate some sample player data
  const generateSamplePlayers = (count: number, multiplier: number = 1) => {
    return Array.from({ length: count }, (_, i) => ({
      uid: `sample-${i}`,
      name: `Player${i + 1}`,
      wagered: {
        today: Math.floor(Math.random() * 10000 * multiplier),
        this_week: Math.floor(Math.random() * 50000 * multiplier),
        this_month: Math.floor(Math.random() * 200000 * multiplier),
        all_time: Math.floor(Math.random() * 1000000 * multiplier)
      }
    }));
  };
  
  // Create sample data for each time period
  const todayPlayers = generateSamplePlayers(10, 0.5);
  const weeklyPlayers = generateSamplePlayers(15, 1);
  const monthlyPlayers = generateSamplePlayers(20, 2);
  const allTimePlayers = generateSamplePlayers(25, 5);
  
  return {
    status: "success",
    metadata: {
      totalUsers: 25,
      lastUpdated: new Date().toISOString(),
    },
    data: {
      today: { data: todayPlayers },
      weekly: { data: weeklyPlayers },
      monthly: { data: monthlyPlayers },
      all_time: { data: allTimePlayers },
    },
  };
}

/**
 * Creates fallback data for wager race position
 * @param userId User ID
 * @param username Username
 * @returns Fallback wager race position data
 */
export function createFallbackWagerRacePosition(userId: string | number, username?: string) {
  // Generate a random position between 1 and 20
  const position = Math.floor(Math.random() * 20) + 1;
  
  // Generate a previous position that's slightly different
  const previousPosition = Math.max(1, position + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 3));
  
  // Calculate end date (end of current month)
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  return {
    position,
    totalParticipants: 100,
    wagerAmount: Math.floor(Math.random() * 50000),
    previousPosition,
    raceType: "monthly",
    raceTitle: "Monthly Wager Race",
    endDate: endDate.toISOString(),
    userId,
    username: username || `User${userId}`
  };
}
