import { QueryClient } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        try {
          // Convert query key array to a stable cache key string
          const cacheKey = Array.isArray(queryKey) 
            ? queryKey.join(':') 
            : String(queryKey);

          // Type the cached data structure
          interface CacheEntry {
            data: unknown;
            timestamp: number;
          }

          const cachedData = sessionStorage.getItem(cacheKey);

          if (cachedData) {
            const { data, timestamp } = JSON.parse(cachedData) as CacheEntry;
            const isStale = Date.now() - timestamp > 60000; // 60 seconds

            if (!isStale) {
              return data;
            }
          }

          const res = await fetch(queryKey[0] as string, {
            credentials: "include",
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });

          if (!res.ok) {
            if (res.status >= 500) {
              throw new Error(`${res.status}: ${res.statusText}`);
            }
            throw new Error(`${res.status}: ${await res.text()}`);
          }

          const data = await res.json();
          sessionStorage.setItem(cacheKey, JSON.stringify({
            data,
            timestamp: Date.now()
          }));

          return data;
        } catch (error) {
          console.error('Query error:', error);
          throw error;
        }
      },
      refetchInterval: 60000, // 60 seconds
      refetchOnWindowFocus: true,
      staleTime: 60000, // 60 seconds
      gcTime: 300000, // 5 minutes (replaces deprecated cacheTime)
      retry: (failureCount, error) => {
        return failureCount < 3 && !(error instanceof Error && error.message.includes('401'));
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: (failureCount, error) => {
        return failureCount < 2 && !(error instanceof Error && error.message.includes('401'));
      },
    },
  },
});