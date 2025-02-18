
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { Redirect, Route } from 'wouter';

// Protected routes that require authentication
export const PROTECTED_ROUTES = [
  '/bonus-codes',
  '/notification-preferences',
  '/user/',
  '/admin/',
];

export function requiresAuth(path: string): boolean {
  return PROTECTED_ROUTES.some(route => path.startsWith(route));
}

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: React.ComponentType<any>;
}) {
  const { user, isLoading, isAuthenticated, error } = useAuth();

  console.log('[ProtectedRoute]', {
    path,
    isLoading,
    hasUser: !!user,
    isAuthenticated,
    hasError: !!error
  });

  // Add error boundary
  if (error) {
    console.error('[ProtectedRoute] Auth error:', error);
    return (
      <Route path={path}>
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <h2 className="text-xl font-bold text-red-500 mb-2">Authentication Error</h2>
          <p className="text-gray-600">{error.message}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
          >
            Retry
          </button>
        </div>
      </Route>
    );
  }

  if (isLoading) {
    console.log('[ProtectedRoute] Loading state');
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user || !isAuthenticated) {
    console.log('[ProtectedRoute] No user or not authenticated, redirecting');
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
