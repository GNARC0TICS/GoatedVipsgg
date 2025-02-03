import React, { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { SelectUser } from "@db/schema";

interface AuthContextType {
  user: SelectUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: { 
    username: string; 
    password: string; 
    email?: string;
  }) => Promise<{ 
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

// Protected routes that require authentication
export const PROTECTED_ROUTES = [
  '/bonus-codes',
  '/notification-preferences',
  '/user/',
  '/admin/',
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const { data: user } = useQuery<SelectUser | null>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/user", {
          credentials: "include",
        });

        if (response.status === 401) {
          setIsAuthenticated(false);
          return null;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }

        const userData = await response.json();
        setIsAuthenticated(true);
        return userData;
      } catch (error) {
        console.error('User fetch error:', error);
        setIsAuthenticated(false);
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string; email?: string }) => {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
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

      setIsAuthenticated(true);
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

      setIsAuthenticated(true);
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
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      setIsAuthenticated(false);
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
            });
            if (response.status === 401) {
              setIsAuthenticated(false);
              return null;
            }
            if (!response.ok) throw new Error('Failed to fetch user data');
            const userData = await response.json();
            setIsAuthenticated(true);
            return userData;
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
        isAuthenticated,
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
        logout: async () => {
          await logoutMutation.mutateAsync();
        },
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

// Helper function to check if a route requires authentication
export function requiresAuth(path: string): boolean {
  return PROTECTED_ROUTES.some(route => path.startsWith(route));
}