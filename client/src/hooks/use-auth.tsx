import { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  user: any | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  error: null,
  isAuthenticated: false
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  interface User {
    id: string;
    username: string;
    [key: string]: any;
  }
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authAttempted, setAuthAttempted] = useState(false);

  useEffect(() => {
    console.log('[Auth] Starting authentication check');
    setAuthAttempted(true);

    fetch('/api/user', {
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    })
      .then(async (res) => {
        console.log('[Auth] Response status:', res.status);
        
        if (res.ok) {
          const data = await res.json();
          console.log('[Auth] User data received:', data ? 'exists' : 'null');
          setUser(data.data);
          setIsAuthenticated(true);
        } else {
          // Log the exact response for debugging
          const errorText = await res.text();
          console.log('[Auth] Not authenticated response:', errorText);
          setUser(null);
          setIsAuthenticated(false);
        }
      })
      .catch((err) => {
        console.error('[Auth] Critical error:', err);
        setError(err);
        setIsAuthenticated(false);
      })
      .finally(() => {
        console.log('[Auth] Authentication check completed. Authenticated:', isAuthenticated);
        setIsLoading(false);
      });
  }, []);

  // Add auth state monitoring
  useEffect(() => {
    console.log('[Auth] State update:', {
      isLoading,
      isAuthenticated,
      hasUser: !!user,
      hasError: !!error,
      authAttempted
    });
  }, [isLoading, isAuthenticated, user, error, authAttempted]);

  return (
    <AuthContext.Provider value={{ user, isLoading, error, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);