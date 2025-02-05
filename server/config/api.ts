export const API_CONFIG = {
  baseUrl: process.env.API_URL || "http://0.0.0.0:5000",
  token: process.env.API_TOKEN,
  endpoints: {
    leaderboard: "/api/affiliate/stats",
    health: "/health"
  },
  fallbackData: {
    // Fallback data structure when API is unavailable
    leaderboard: {
      status: "success",
      metadata: {
        totalUsers: 0,
        lastUpdated: new Date().toISOString()
      },
      data: {
        today: { data: [] },
        weekly: { data: [] },
        monthly: { data: [] },
        all_time: { data: [] }
      }
    }
  }
};