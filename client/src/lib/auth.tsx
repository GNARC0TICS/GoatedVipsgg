import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { SelectUser } from '@db/schema';

interface AuthContextType {
  user: SelectUser | null;
  isLoading: boolean;
  login: (googleToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  const { data: user } = useQuery<SelectUser>({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (googleToken: string) => {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: googleToken }),
      });
      if (!res.ok) throw new Error('Login failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: 'Success',
        description: 'Successfully logged in',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (!res.ok) throw new Error('Logout failed');
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/auth/user'], null);
      toast({
        title: 'Success',
        description: 'Successfully logged out',
      });
    },
  });

  useEffect(() => {
    setIsLoading(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        login: loginMutation.mutateAsync,
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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
