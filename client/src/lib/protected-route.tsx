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

  // Add proper loading state
  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  // Handle authentication errors
  if (error) {
    console.error('Authentication error:', error);
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Redirect to auth page if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Render protected component if authenticated
  return <Route path={path} component={Component} />;
}