import { createContext, useContext, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

// Define user type based on our schema
export interface User {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
  telegramId?: string;
  telegramVerified: boolean;
  emailVerified: boolean;
  goatedUsername?: string;
  goatedVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  linkGoatedAccount: (goatedUsername: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const goatedLinkSchema = z.object({
  goatedUsername: z.string().min(1, "Goated username is required"),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  // User query
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['user'],
    queryFn: async () => {
      const res = await fetch('/api/auth/user', {
        credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 401) return null;
        throw new Error('Failed to fetch user');
      }
      return res.json();
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const validated = loginSchema.parse(credentials);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Login failed');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      setError(null);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
    },
    onError: (error: Error) => {
      setError(error);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (data: { username: string; email: string; password: string }) => {
      const validated = registerSchema.parse(data);
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Registration failed');
      }

      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Registration successful",
        description: "Please log in with your new account.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Logout failed');
    },
    onSuccess: () => {
      queryClient.setQueryData(['user'], null);
      setError(null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      setError(error);
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Goated account linking mutation
  const linkGoatedMutation = useMutation({
    mutationFn: async (goatedUsername: string) => {
      const validated = goatedLinkSchema.parse({ goatedUsername });
      const res = await fetch('/api/auth/link-goated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to link Goated account');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast({
        title: "Account linked",
        description: "Your Goated account has been successfully linked.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to link account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const login = async (username: string, password: string) => {
    await loginMutation.mutateAsync({ username, password });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const register = async (username: string, email: string, password: string) => {
    await registerMutation.mutateAsync({ username, email, password });
  };

  const linkGoatedAccount = async (goatedUsername: string) => {
    await linkGoatedMutation.mutateAsync(goatedUsername);
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading: isLoading || loginMutation.isPending || logoutMutation.isPending,
        error,
        isAuthenticated: !!user,
        login,
        logout,
        register,
        linkGoatedAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};