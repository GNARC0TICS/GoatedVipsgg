interface APIEndpoints {
  leaderboard: string;
  currentRace: string;
  previousRace: string;
  health: string;
}

interface APIConfig {
  baseUrl: string;
  token: string;
  endpoints: APIEndpoints;
}

export const API_CONFIG: APIConfig = {
  baseUrl: process.env.API_BASE_URL || "http://localhost:5000/api",
  token: process.env.API_TOKEN || "",
  endpoints: {
    leaderboard: "/affiliate/stats",
    currentRace: "/wager-races/current",
    previousRace: "/wager-races/previous",
    health: "/health",
  },
};