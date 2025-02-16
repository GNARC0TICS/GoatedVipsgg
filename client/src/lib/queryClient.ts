import { QueryClient, QueryKey } from "@tanstack/react-query";

type GetQueryFnOptions = {
  on401?: "throw" | "returnNull";
};

export async function apiRequest(
  method: string,
  endpoint: string,
  body?: any
): Promise<Response> {
  const response = await fetch(endpoint, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache"
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response;
}

export function getQueryFn({ on401 = "throw" }: GetQueryFnOptions = {}) {
  return async ({ queryKey }: { queryKey: QueryKey }) => {
    try {
      const cacheKey = Array.isArray(queryKey) ? queryKey.join("-") : String(queryKey);
      const cachedData = localStorage.getItem(cacheKey);

      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        const isStale = Date.now() - timestamp > 60000;

        if (!isStale) {
          return data;
        }
      }

      const res = await apiRequest("GET", queryKey[0] as string);

      if (!res.ok) {
        if (res.status === 401 && on401 === "returnNull") {
          return null;
        }
        throw new Error(`${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      localStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now()
      }));

      return data;
    } catch (error) {
      console.error("Query error:", error);
      throw error;
    }
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn(),
      refetchInterval: 60000,
      refetchOnWindowFocus: true,
      staleTime: 60000,
      gcTime: 300000,
      retry: (failureCount, error: any) => {
        return failureCount < 3 && !error.message.includes("401");
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: (failureCount, error: any) => {
        return failureCount < 2 && !error.message.includes("401");
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      console.error("Query error:", error)
    }
  })
});