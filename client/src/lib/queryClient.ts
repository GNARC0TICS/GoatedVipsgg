
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache configuration
      staleTime: 30000, // Data stays fresh for 30 seconds
      cacheTime: 300000, // Cache persists for 5 minutes
      
      // Refetch behavior
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchInterval: 30000,
      
      // Error handling
      retry: (failureCount, error) => {
        return failureCount < 3 && !error.message.includes('401');
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Query function
      queryFn: async ({ queryKey }) => {
        try {
          const cacheKey = Array.isArray(queryKey) ? queryKey.join('-') : queryKey;
          const cachedData = sessionStorage.getItem(cacheKey);
          
          if (cachedData) {
            const { data, timestamp } = JSON.parse(cachedData);
            const isStale = Date.now() - timestamp > 30000;
            if (!isStale) return data;
          }

          const res = await fetch(queryKey[0] as string, {
            credentials: "include",
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });

          if (!res.ok) {
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
    },
    mutations: {
      retry: (failureCount, error) => {
        return failureCount < 2 && !error.message.includes('401');
      },
    },
  },
});
