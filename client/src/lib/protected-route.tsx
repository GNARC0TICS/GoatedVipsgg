import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { Redirect, Route } from 'wouter';

// Protected routes that require authentication
export const PROTECTED_ROUTES = [
  '/bonus-codes',
  '/wheel-spin',
  '/admin/',
  '/user/',
  '/notification-preferences',
  '/notifications'
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
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}