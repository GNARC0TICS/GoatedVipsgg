import { type LeaderboardUser, type WagerData } from "../types";
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

    const transformedUsers = users.map((user: any) => ({
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
        today: { data: sortByWagered(transformedUsers, 'today') },
        weekly: { data: sortByWagered(transformedUsers, 'this_week') },
        monthly: { data: sortByWagered(transformedUsers, 'this_month') },
        all_time: { data: sortByWagered(transformedUsers, 'all_time') }
      }
    };
  } catch (error) {
    console.error('Error transforming leaderboard data:', error);
    throw error;
  }
}