import { useQuery } from '@tanstack/react-query';

export function useUser() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      // Check for token in localStorage first
      const token = localStorage.getItem('token');
      if (!token) {
        return null;
      }

      const response = await fetch('/api/user');
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token'); // Clear invalid token
          return null;
        }
        throw new Error('Failed to fetch user');
      }

      return response.json();
    },
    retry: false,
    staleTime: 30000, // Cache for 30 seconds
    cacheTime: 60000, // Keep in cache for 1 minute
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user
  };
}