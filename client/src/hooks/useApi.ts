import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";

interface ApiOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
  staleTime?: number;
  cacheTime?: number;
}

// Default cache times
const CACHE_TIMES = {
  SHORT: 1000 * 30, // 30 seconds
  MEDIUM: 1000 * 60 * 2, // 2 minutes
  LONG: 1000 * 60 * 5, // 5 minutes
};

// API Response schemas
export const affiliateStatsSchema = z.object({
  success: z.boolean(),
  data: z.object({
    today: z.object({
      data: z.array(z.object({
        uid: z.string(),
        name: z.string(),
        wagered: z.number().optional(),
      }))
    }),
    weekly: z.object({
      data: z.array(z.object({
        uid: z.string(),
        name: z.string(),
        wagered: z.number().optional(),
      }))
    }),
    monthly: z.object({
      data: z.array(z.object({
        uid: z.string(),
        name: z.string(),
        wagered: z.number().optional(),
        position: z.number().optional(),
      }))
    }),
    all_time: z.object({
      data: z.array(z.object({
        uid: z.string(),
        name: z.string(),
        wagered: z.number().optional(),
      }))
    }),
  }),
  metadata: z.object({
    totalUsers: z.number(),
    lastUpdated: z.string(),
  }),
});

export type AffiliateResponse = z.infer<typeof affiliateStatsSchema>;

// Reusable fetch function with error handling and retry logic
async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const apiToken = import.meta.env.VITE_API_TOKEN;

  if (!apiBaseUrl || !apiToken) {
    throw new Error('API configuration missing');
  }

  let lastError;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(resolve =>
          setTimeout(resolve, INITIAL_RETRY_DELAY * Math.pow(2, attempt))
        );
      }
    }
  }
  throw lastError;
}

// Hook for affiliate stats with optimized caching
export function useAffiliateStats(options: ApiOptions = {}) {
  return useQuery({
    queryKey: ['affiliate-stats'],
    queryFn: () => fetchApi('/api/affiliate/stats'),
    staleTime: CACHE_TIMES.MEDIUM,
    cacheTime: CACHE_TIMES.LONG,
    refetchInterval: 30000, // Refresh every 30 seconds
    select: (data) => {
      const parsed = affiliateStatsSchema.safeParse(data);
      if (!parsed.success) {
        console.error('API Schema validation failed:', parsed.error);
        return null;
      }
      return parsed.data;
    },
    ...options,
  });
}

// Hook for current wager race data
export function useCurrentWagerRace(options: ApiOptions = {}) {
  return useQuery({
    queryKey: ['current-race'],
    queryFn: () => fetchApi('/api/wager-races/current'),
    staleTime: CACHE_TIMES.MEDIUM,
    cacheTime: CACHE_TIMES.LONG,
    refetchInterval: 60000, // Refresh every minute
    ...options,
  });
}

// Hook for chat messages
export function useChatMessages(options: ApiOptions = {}) {
  return useQuery({
    queryKey: ['chat-messages'],
    queryFn: () => fetchApi('/api/chat/messages'),
    staleTime: CACHE_TIMES.SHORT,
    cacheTime: CACHE_TIMES.MEDIUM,
    refetchInterval: 10000, // Refresh every 10 seconds
    ...options,
  });
}

// Hook for sending chat messages
export function useSendChatMessage() {
  return useMutation({
    mutationFn: (message: string) =>
      fetchApi('/api/chat/messages', {
        method: 'POST',
        body: JSON.stringify({ message }),
      }),
  });
}

// Hook for analytics data with aggressive caching
export function useAnalytics(options: ApiOptions = {}) {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: () => fetchApi('/api/admin/analytics'),
    staleTime: CACHE_TIMES.LONG,
    cacheTime: CACHE_TIMES.LONG,
    refetchInterval: 300000, // Refresh every 5 minutes
    ...options,
  });
}

// Batch request hook for multiple endpoints
export function useBatchRequest(requests: string[], options: ApiOptions = {}) {
  return useQuery({
    queryKey: ['batch', requests],
    queryFn: () =>
      fetchApi('/api/batch', {
        method: 'POST',
        body: JSON.stringify({ requests }),
      }),
    staleTime: CACHE_TIMES.MEDIUM,
    ...options,
  });
}