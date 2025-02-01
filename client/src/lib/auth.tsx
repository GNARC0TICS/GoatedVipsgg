import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { SelectUser } from "@db/schema";

interface AuthContextType {
  user: SelectUser | null;
  isLoading: boolean;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  register: (credentials: {
    username: string;
    password: string;
    email: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  const { data: userResponse } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/user", {
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          if (response.status === 401) {
            return { ok: false, user: null };
          }
          const error = await response.json();
          throw new Error(error.message || "Failed to fetch user data");
        }

        return response.json();
      } catch (error) {
        console.error("Error fetching user:", error);
        return { ok: false, user: null };
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      if (!credentials?.username?.trim() || !credentials?.password?.trim()) {
        throw new Error("Username and password are required");
      }

      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          username: credentials.username.trim(),
          password: credentials.password.trim(),
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.ok && data.user) {
        queryClient.setQueryData(["/api/user"], data);
        toast({
          title: "Success",
          description: "Successfully logged in",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
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
          Accept: "application/json",
        },
        body: JSON.stringify(credentials),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.ok && data.user) {
        queryClient.setQueryData(["/api/user"], data);
        toast({
          title: "Success",
          description: "Account created successfully",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/logout", {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Logout failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.ok) {
        queryClient.setQueryData(["/api/user"], { ok: true, user: null });
        toast({
          title: "Success",
          description: "Successfully logged out",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const user = userResponse?.ok && userResponse?.user ? userResponse.user : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login: loginMutation.mutateAsync,
        register: registerMutation.mutateAsync,
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