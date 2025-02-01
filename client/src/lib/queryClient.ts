import { QueryClient } from "@tanstack/react-query";

// Create a custom query client with better error handling and retry logic
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reduce retry attempts for failed queries
      retry: 2,
      // Add exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Increase stale time to reduce unnecessary refetches
      staleTime: 1000 * 60 * 5, // 5 minutes
      // Add better error handling
      onError: (error) => {
        console.error("Query error:", error);
      },
      // Prevent background refetches while the window is hidden
      refetchOnWindowFocus: false,
    },
  },
});