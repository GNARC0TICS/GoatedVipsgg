import { log } from "../vite";

export const API_CONFIG = {
  baseUrl: "https://europe-west2-g3casino.cloudfunctions.net/user",
  token: process.env.API_TOKEN || "",
  endpoints: {
    leaderboard: "/affiliate/referral-leaderboard/2RW440E",
    health: "/health"
  },
  fallbackData: {
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

// External API token - completely separate from auth
const EXTERNAL_API_TOKEN = process.env.API_TOKEN || API_CONFIG.token;

export async function makeAPIRequest(endpoint: string) {
  try {
    const response = await fetch(
      `${API_CONFIG.baseUrl}${endpoint}`,
      {
        headers: {
          Authorization: `Bearer ${EXTERNAL_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      log(`External API request failed: ${response.status}`);
      return API_CONFIG.fallbackData.leaderboard;
    }

    return response.json();
  } catch (error) {
    log(`External API error: ${error}`);
    return API_CONFIG.fallbackData.leaderboard;
  }
}