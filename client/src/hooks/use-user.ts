import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InsertUser, SelectUser } from "@db/schema";
import { useToast } from "@/hooks/use-toast";

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
      // Enhanced error handling for different status codes
      if (response.status === 401) {
        return { ok: false, message: "Not authenticated" };
      }
      if (response.status === 403) {
        return { ok: false, message: "Access denied" };
      }
      if (response.status === 404) {
        return { ok: false, message: "Resource not found" };
      }
      if (response.status >= 500) {
        return { ok: false, message: "Server error occurred" };
      }

      const data = await response.json().catch(() => ({}));
      return { 
        ok: false, 
        message: data.message || data.error || "Request failed",
        errors: data.errors
      };
    }

    const data = await response.json();
    return { 
      ok: true,
      user: data.user
    };
  } catch (e: any) {
    console.error("Request error:", e);
    return { ok: false, message: "Network error occurred" };
  }
}

export function useUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: user,
    error,
    isLoading,
    refetch
  } = useQuery<SelectUser | null>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const result = await handleRequest("/api/user", "GET");
      if (!result.ok) {
        if (result.message === "Not authenticated") {
          return null;
        }
        throw new Error(result.message);
      }
      return result.user || null;
    },
    staleTime: 30000, // Data considered fresh for 30 seconds
    gcTime: 60000, // Keep in cache for 1 minute
    retry: 1, // Only retry once on failure
    refetchOnWindowFocus: true // Update when window regains focus
  });

  const loginMutation = useMutation({
    mutationFn: async (userData: Pick<InsertUser, "username" | "password">) => {
      return handleRequest("/api/login", "POST", userData as InsertUser);
    },
    onSuccess: (data) => {
      if (data.ok && data.user) {
        queryClient.setQueryData(["/api/user"], data.user);
        toast({
          title: "Success",
          description: "Logged in successfully",
        });
      }
    },
    onError: (error: Error) => {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => handleRequest("/api/logout", "POST"),
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      queryClient.clear(); // Clear all queries on logout
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (userData: InsertUser) => handleRequest("/api/register", "POST", userData),
    onSuccess: (data) => {
      if (data.ok && data.user) {
        queryClient.setQueryData(["/api/user"], data.user);
        toast({
          title: "Success",
          description: "Registration successful",
        });
      }
    },
    onError: (error: Error) => {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    user,
    isLoading,
    error,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    refetch,
  };
}