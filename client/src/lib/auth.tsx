import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { 
  auth, 
  loginWithEmailAndPassword, 
  registerWithEmailAndPassword, 
  signInWithGoogle,
  logout as firebaseLogout,
  getCurrentUser
} from './firebase';
import { User as FirebaseUser } from 'firebase/auth';

// Define paths that require authentication
const PROTECTED_ROUTES = [
  '/admin',
  '/profile',
  '/settings',
  '/challenges',
  '/races/manage'
];

// Types for our auth context
type AuthContextType = {
  user: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: { email: string; password: string }) => Promise<{ 
    ok: boolean;
    message?: string;
    errors?: Record<string, string[]>;
  }>;
  registerWithEmail: (credentials: { 
    email: string; 
    password: string; 
    username?: string;
  }) => Promise<{
    ok: boolean;
    message?: string;
    errors?: Record<string, string[]>;
  }>;
  loginWithGoogle: () => Promise<{
    ok: boolean;
    message?: string;
  }>;
  logout: () => Promise<void>;
};

// Create the context with default values
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Props for our provider
type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const queryClient = useQueryClient();

  // Setup auth state listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthenticated(!!firebaseUser);
      setIsLoading(false);

      // Invalidate queries that might depend on auth state
      if (firebaseUser) {
        queryClient.invalidateQueries({ queryKey: ['user'] });
      }
    });

    return () => unsubscribe();
  }, [queryClient]);

  // Handle email/password login
  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const result = await loginWithEmailAndPassword(credentials.email, credentials.password);

      if (!result.success) {
        return {
          ok: false,
          message: "Invalid email or password"
        };
      }

      setIsAuthenticated(true);
      return {
        ok: true
      };
    }
  });

  // Handle email/password registration
  const registerMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string; username?: string }) => {
      const result = await registerWithEmailAndPassword(credentials.email, credentials.password);

      if (!result.success) {
        return {
          ok: false,
          message: "Registration failed. Please try again."
        };
      }

      setIsAuthenticated(true);
      return {
        ok: true
      };
    }
  });

  // Handle Google sign in
  const googleLoginMutation = useMutation({
    mutationFn: async () => {
      const result = await signInWithGoogle();

      if (!result.success) {
        return {
          ok: false,
          message: "Google sign in failed. Please try again."
        };
      }

      setIsAuthenticated(true);
      return {
        ok: true
      };
    }
  });

  // Handle logout
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await firebaseLogout();
      setIsAuthenticated(false);
      queryClient.invalidateQueries({ queryKey: ['user'] });
    }
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login: async (credentials) => {
          const result = await loginMutation.mutateAsync(credentials);
          return {
            ok: result.ok,
            message: result.message
          };
        },
        registerWithEmail: async (credentials) => {
          const result = await registerMutation.mutateAsync(credentials);
          return {
            ok: result.ok,
            message: result.message
          };
        },
        loginWithGoogle: async () => {
          const result = await googleLoginMutation.mutateAsync();
          return {
            ok: result.ok,
            message: result.message
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