
import React, { createContext, useContext, useEffect, useState } from "react";
import type { SelectUser } from "@db/schema";
import { queryClient } from "@/lib/queryClient";

// Define the shape of our authentication context
interface AuthContextType {
  user: SelectUser | null;
  loading: boolean;
  error: Error | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Create the context with a default undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider Component
// Provides authentication state and methods to the entire application
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Core state management for auth
  const [user, setUser] = useState<SelectUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Effect to check authentication status on mount
  useEffect(() => {
    if (!user && !error) {
      checkAuth();
    }
  }, [user, error]);

  // Verify current authentication status
  const checkAuth = async () => {
    try {
      const response = await fetch("/api/user", {
        credentials: "include"
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (err) {
      console.error("Auth check failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle user login
  const login = async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const userData = await response.json();
      setUser(userData);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Handle user registration
  const register = async (username: string, email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
      });

      if (!response.ok) {
        throw new Error("Registration failed");
      }

      const userData = await response.json();
      setUser(userData);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Handle user logout
  const logout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include"
      });
      setUser(null);
      queryClient.clear();
    } catch (err) {
      console.error("Logout failed:", err);
      throw err;
    }
  };

  // Provide authentication context to children
  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use authentication context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
