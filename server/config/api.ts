
export const API_CONFIG = {
  baseUrl: process.env.API_BASE_URL || "https://api.goatedvips.gg",
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
  },
  retryOptions: {
    maxRetries: 3,
    delayMs: 1000,
    timeoutMs: 5000
  }
};

export async function fetchWithRetry(url: string, options: RequestInit = {}) {
  const { maxRetries, delayMs, timeoutMs } = API_CONFIG.retryOptions;
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${API_CONFIG.token}`,
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
      }
    }
  }

  throw lastError;
}
