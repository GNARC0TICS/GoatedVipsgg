import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { SelectUser } from "@db/schema";

interface AuthContextType {
  user: SelectUser | null;
  isLoading: boolean;
  login: (credentials: { username: string; password: string }) => Promise<{ 
    ok: boolean; 
    message?: string; 
    errors?: Record<string, string>; 
  }>;
  register: (credentials: {
    username: string;
    password: string;
    email: string;
  }) => Promise<{ 
    ok: boolean; 
    message?: string; 
    errors?: Record<string, string>; 
  }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  const { data: user, isError: userError } = useQuery<SelectUser | null>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/user", {
          credentials: "include",
          headers: {
            "Accept": "application/json"
          }
        });

        if (response.status === 401) {
          return null;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }

        return response.json();
      } catch (error) {
        console.error('User fetch error:', error);
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          username: credentials.username.trim(),
          password: credentials.password.trim()
        }),
        credentials: "include"
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          ok: false,
          message: data.message || "Login failed",
          errors: data.errors
        };
      }

      return {
        ok: true,
        user: data
      };
    },
    onSuccess: (data) => {
      if (data.ok && data.user) {
        queryClient.setQueryData(["/api/user"], data.user);
      }
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: {
      username: string;
      password: string;
      email: string;
    }) => {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(credentials),
        credentials: "include"
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          ok: false,
          message: data.message || "Registration failed",
          errors: data.errors
        };
      }

      return {
        ok: true,
        user: data
      };
    },
    onSuccess: (data) => {
      if (data.ok && data.user) {
        queryClient.setQueryData(["/api/user"], data.user);
      }
    }
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      return { ok: true };
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
    },
  });

  useEffect(() => {
    const initAuth = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: ["/api/user"],
          queryFn: async () => {
            const response = await fetch("/api/user", {
              credentials: "include",
              headers: {
                "Accept": "application/json"
              }
            });
            if (response.status === 401) return null;
            if (!response.ok) throw new Error('Failed to fetch user data');
            return response.json();
          }
        });
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        login: async (credentials) => {
          const result = await loginMutation.mutateAsync(credentials);
          return {
            ok: result.ok,
            message: result.message,
            errors: result.errors
          };
        },
        register: async (credentials) => {
          const result = await registerMutation.mutateAsync(credentials);
          return {
            ok: result.ok,
            message: result.message,
            errors: result.errors
          };
        },
        logout: logoutMutation.mutateAsync,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}