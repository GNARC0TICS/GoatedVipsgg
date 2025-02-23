import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InsertUser, SelectUser } from "@db/schema";

type RequestResult =
  | {
      ok: true;
      user?: SelectUser;
    }
  | {
      ok: false;
      message: string;
      errors?: Record<string, string>;
    };

async function handleRequest(
  url: string,
  method: string,
  body?: InsertUser,
): Promise<RequestResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status >= 500) {
        return { ok: false, message: "Server error occurred" };
      }

      const data = await response.json();
      return { 
        ok: false, 
        message: data.message || "Authentication failed",
        errors: data.errors
      };
    }

    const data = await response.json();
    return { 
      ok: true,
      user: data
    };
  } catch (e: any) {
    return { ok: false, message: e.toString() };
  }
}

export function useUser() {
  const queryClient = useQueryClient();

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const response = await fetch('/api/user', { credentials: 'include' });
      if (!response.ok) {
        if (response.status === 401) {
          return null; // Return null for unauthenticated users instead of throwing
        }
        throw new Error('Failed to fetch user');
      }
      const data = await response.json();
      return data.user;
    },
    staleTime: 30000, // Data considered fresh for 30 seconds
    gcTime: 60000, // Keep in cache for 1 minute (replaces deprecated cacheTime)
    refetchOnWindowFocus: false
  });

  const loginMutation = useMutation<RequestResult, Error, InsertUser>({
    mutationFn: (userData) => handleRequest("/api/login", "POST", userData),
    onSuccess: (data) => {
      if (data.ok && data.user) {
        queryClient.setQueryData(["/api/user"], data.user);
      }
    },
  });

  const logoutMutation = useMutation<RequestResult, Error>({
    mutationFn: () => handleRequest("/api/logout", "POST"),
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
    },
  });

  const registerMutation = useMutation<RequestResult, Error, InsertUser>({
    mutationFn: (userData) => handleRequest("/api/register", "POST", userData),
    onSuccess: (data) => {
      if (data.ok && data.user) {
        queryClient.setQueryData(["/api/user"], data.user);
      }
    },
  });

  return {
    user,
    isLoading,
    error,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    register: registerMutation.mutateAsync,
  };
}