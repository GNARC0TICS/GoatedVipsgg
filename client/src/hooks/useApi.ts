import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface ApiOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
  staleTime?: number;
  cacheTime?: number;
}

// Optimized cache times based on data volatility
const CACHE_TIMES = {
  SHORT: 1000 * 30,      // 30 seconds
  MEDIUM: 1000 * 60,     // 1 minute
  LONG: 1000 * 300,      // 5 minutes
  STATIC: 1000 * 3600,   // 1 hour
};

// Request deduplication cache
const pendingRequests = new Map<string, Promise<any>>();

// Batching queue
interface BatchRequest {
  endpoint: string;
  options: RequestInit;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

let batchQueue: BatchRequest[] = [];
let batchTimeout: NodeJS.Timeout | null = null;
const BATCH_DELAY = 50; // ms

// Reusable fetch function with batching and deduplication
async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const cacheKey = `${options.method || 'GET'}-${endpoint}-${JSON.stringify(options.body || '')}`;

  // Return cached promise for pending requests
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  // Create new promise for this request
  const requestPromise = new Promise((resolve, reject) => {
    // Add to batch queue
    batchQueue.push({ endpoint, options, resolve, reject });

    // Setup batch timeout
    if (!batchTimeout) {
      batchTimeout = setTimeout(processBatch, BATCH_DELAY);
    }
  });

  // Store in pending cache
  pendingRequests.set(cacheKey, requestPromise);

  try {
    return await requestPromise;
  } finally {
    pendingRequests.delete(cacheKey);
  }
}

// Process batch of requests
async function processBatch() {
  batchTimeout = null;
  const requests = [...batchQueue];
  batchQueue = [];

  if (requests.length === 0) return;
  if (requests.length === 1) {
    // Single request - process normally
    const { endpoint, options, resolve, reject } = requests[0];
    try {
      const response = await fetch(endpoint, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      resolve(data);
    } catch (error) {
      reject(error);
    }
    return;
  }

  // Multiple requests - use batch endpoint
  try {
    const response = await fetch('/api/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify({
        requests: requests.map(({ endpoint }) => ({ endpoint }))
      })
    });

    if (!response.ok) {
      throw new Error(`Batch API Error: ${response.status}`);
    }

    const { results } = await response.json();

    // Resolve individual promises
    requests.forEach(({ resolve, reject }, index) => {
      const result = results[index];
      if (result.error) {
        reject(new Error(result.error));
      } else {
        resolve(result);
      }
    });
  } catch (error) {
    // Reject all promises on batch failure
    requests.forEach(({ reject }) => reject(error));
  }
}

// React Query hooks with optimized settings
export function useAffiliateStats(username?: string, options: ApiOptions = {}) {
  const queryClient = useQueryClient();
  const endpoint = username
    ? `/api/affiliate/stats?username=${encodeURIComponent(username)}`
    : '/api/affiliate/stats';

  return useQuery({
    queryKey: ['affiliate-stats', username],
    queryFn: () => fetchApi(endpoint),
    staleTime: CACHE_TIMES.SHORT,
    cacheTime: CACHE_TIMES.MEDIUM,
    refetchInterval: 60000, // Poll every minute
    retry: 2,
    ...options,
    onSuccess: (data) => {
      // Prefetch individual user data
      if (!username && data?.data?.today?.data) {
        data.data.today.data.forEach((user: any) => {
          queryClient.prefetchQuery({
            queryKey: ['affiliate-stats', user.name],
            queryFn: () => fetchApi(`/api/affiliate/stats?username=${encodeURIComponent(user.name)}`),
            staleTime: CACHE_TIMES.MEDIUM
          });
        });
      }
    }
  });
}

// Current wager race with optimized polling
export function useCurrentWagerRace(options: ApiOptions = {}) {
  return useQuery({
    queryKey: ['current-race'],
    queryFn: () => fetchApi('/api/wager-races/current'),
    staleTime: CACHE_TIMES.SHORT,
    cacheTime: CACHE_TIMES.MEDIUM,
    refetchInterval: 60000, // Poll every minute
    retry: 2,
    ...options,
  });
}

// User data with prefetching
export function useUserData(options: ApiOptions = {}) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['user'],
    queryFn: () => fetchApi('/api/user'),
    staleTime: CACHE_TIMES.MEDIUM,
    cacheTime: CACHE_TIMES.LONG,
    retry: 2,
    ...options,
    onSuccess: (data) => {
      // Prefetch related data
      if (data?.username) {
        queryClient.prefetchQuery({
          queryKey: ['affiliate-stats', data.username],
          queryFn: () => fetchApi(`/api/affiliate/stats?username=${encodeURIComponent(data.username)}`),
          staleTime: CACHE_TIMES.MEDIUM
        });
      }
    }
  });
}

// Analytics with aggressive caching
export function useAnalytics(options: ApiOptions = {}) {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: () => fetchApi('/api/admin/analytics'),
    staleTime: CACHE_TIMES.LONG,
    cacheTime: CACHE_TIMES.STATIC,
    refetchInterval: 300000, // Poll every 5 minutes
    ...options,
  });
}

// Socket connection status hook
export function useSocketStatus() {
  return useQuery({
    queryKey: ['socket-status'],
    queryFn: () => fetchApi('/api/health'),
    staleTime: CACHE_TIMES.SHORT,
    refetchInterval: 30000, // Check every 30 seconds
    retry: false,
  });
}

// Chat messages with shorter cache
export function useChatMessages(options: ApiOptions = {}) {
  return useQuery({
    queryKey: ['chat-messages'],
    queryFn: () => fetchApi('/api/chat/messages'),
    staleTime: CACHE_TIMES.SHORT,
    cacheTime: CACHE_TIMES.MEDIUM,
    refetchInterval: 10000, // Poll every 10 seconds
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


// Optimized batch request with smart retries
export function useBatchRequest(requests: string[], options: ApiOptions = {}) {
  return useQuery({
    queryKey: ['batch', requests],
    queryFn: () =>
      fetchApi('/api/batch', {
        method: 'POST',
        body: JSON.stringify({ requests }),
      }),
    staleTime: CACHE_TIMES.MEDIUM,
    retry: 2,
    ...options,
  });
}