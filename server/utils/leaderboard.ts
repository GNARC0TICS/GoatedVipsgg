
import { log } from "../vite";

interface WagerData {
  today: number;
  this_week: number;
  this_month: number;
  all_time: number;
}

interface LeaderboardUser {
  uid: string;
  name: string;
  wagered: WagerData;
}

function validateWagerData(user: any): boolean {
  return user?.wagered && 
         typeof user.wagered === 'object' &&
         'today' in user.wagered &&
         'this_week' in user.wagered &&
         'this_month' in user.wagered &&
         'all_time' in user.wagered;
}

function filterNonZeroUsers(users: LeaderboardUser[], period: keyof WagerData): LeaderboardUser[] {
  return users.filter(user => user.wagered[period] > 0);
}

function sortByWagered(data: LeaderboardUser[], period: keyof WagerData): LeaderboardUser[] {
  return [...data].sort((a, b) => {
    const bWager = b.wagered[period] || 0;
    const aWager = a.wagered[period] || 0;
    return bWager - aWager;
  });
}

export async function transformLeaderboardData(apiData: any) {
  try {
    const users = Array.isArray(apiData) ? apiData : apiData?.data || [];
    
    log(`Processing ${users.length} users from API`);

    const transformedUsers = users
      .filter(validateWagerData)
      .map((user: any) => ({
        uid: user.uid || '',
        name: user.name || 'Anonymous',
        wagered: {
          today: Number(user.wagered?.today || 0),
          this_week: Number(user.wagered?.this_week || 0),
          this_month: Number(user.wagered?.this_month || 0),
          all_time: Number(user.wagered?.all_time || 0)
        }
      }));

    return {
      status: "success",
      metadata: {
        totalUsers: transformedUsers.length,
        lastUpdated: new Date().toISOString()
      },
      data: {
        today: { data: sortByWagered(filterNonZeroUsers(transformedUsers, 'today'), 'today') },
        weekly: { data: sortByWagered(filterNonZeroUsers(transformedUsers, 'this_week'), 'this_week') },
        monthly: { data: sortByWagered(filterNonZeroUsers(transformedUsers, 'this_month'), 'this_month') },
        all_time: { data: sortByWagered(filterNonZeroUsers(transformedUsers, 'all_time'), 'all_time') }
      }
    };
  } catch (error) {
    console.error('Error transforming leaderboard data:', error);
    throw error;
  }
}
