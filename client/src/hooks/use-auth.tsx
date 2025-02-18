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
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    fetch('/api/user')
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setUser(data.data);
          setIsAuthenticated(true);
        } else {
          // Not authenticated - this is a valid state
          setUser(null);
          setIsAuthenticated(false);
        }
      })
      .catch((err) => {
        console.error('Auth error:', err);
        setError(err);
        setIsAuthenticated(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, error, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);