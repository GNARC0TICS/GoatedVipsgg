import { log } from "../vite";

export const API_CONFIG = {
  baseUrl: "https://europe-west2-g3casino.cloudfunctions.net/user",
  token: process.env.API_TOKEN || "",
  endpoints: {
    leaderboard: "/affiliate/referral-leaderboard/2RW440E",
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

// Helper function to make API requests
export async function makeAPIRequest(endpoint: string) {
  if (!API_CONFIG.token) {
    log("API token is missing");
    throw new Error("API token is required");
  }

  const response = await fetch(
    `${API_CONFIG.baseUrl}${endpoint}`,
    {
      headers: {
        Authorization: `Bearer ${API_CONFIG.token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      log("API Authentication failed - check API token");
      throw new Error("API Authentication failed");
    }
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}