import { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  user: any | null;
  isLoading: boolean;
  error: Error | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  error: null
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/user', { credentials: 'include' })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setUser(data.data);
        } else if (res.status === 401) {
          // Not authenticated - this is a valid state
          setUser(null);
        } else {
          throw new Error(`Authentication failed: ${res.status}`);
        }
      })
      .catch((err) => {
        console.error('Auth error:', err);
        setError(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);