
import { API_CONFIG } from "../config/api";

export class StatsService {
  static async getWagerStats(username?: string) {
    try {
      const url = username 
        ? `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}?username=${encodeURIComponent(username)}`
        : `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${process.env.API_TOKEN || API_CONFIG.token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return this.transformWagerData(data, username);
    } catch (error) {
      console.error("Error fetching wager stats:", error);
      throw error;
    }
  }

  static async getRankings() {
    const data = await this.getWagerStats();
    return {
      daily: this.calculateRankings(data, 'today'),
      weekly: this.calculateRankings(data, 'this_week'),
      monthly: this.calculateRankings(data, 'this_month'),
      allTime: this.calculateRankings(data, 'all_time')
    };
  }

  private static calculateRankings(data: any, period: 'today' | 'this_week' | 'this_month' | 'all_time') {
    if (!data?.data) return [];
    
    return data.data
      .sort((a: any, b: any) => (b.wagered[period] || 0) - (a.wagered[period] || 0))
      .map((entry: any, index: number) => ({
        rank: index + 1,
        username: entry.name,
        wager: entry.wagered[period] || 0
      }));
  }

  private static transformWagerData(data: any, username?: string) {
    const users = data?.data || [];
    if (username) {
      const user = users.find((u: any) => u.name === username);
      if (!user) return null;
      
      return {
        username: user.name,
        wagered: {
          today: user.wagered?.today || 0,
          this_week: user.wagered?.this_week || 0,
          this_month: user.wagered?.this_month || 0,
          all_time: user.wagered?.all_time || 0
        }
      };
    }

    return {
      metadata: {
        totalUsers: users.length,
        lastUpdated: new Date().toISOString()
      },
      data: users.map((user: any) => ({
        username: user.name,
        wagered: {
          today: user.wagered?.today || 0,
          this_week: user.wagered?.this_week || 0,
          this_month: user.wagered?.this_month || 0,
          all_time: user.wagered?.all_time || 0
        }
      }))
    };
  }
}
