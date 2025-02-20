import { createContext, useContext } from 'react';
import { useUser } from './use-user';

interface AuthContextType {
  user: any | null;
  isLoading: boolean;
  error: Error | null;
  login: (data: any) => Promise<any>;
  register: (data: any) => Promise<any>;
  logout: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { 
    user, 
    isLoading, 
    error,
    login,
    register,
    logout,
  } = useUser();

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isLoading, 
        error,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);