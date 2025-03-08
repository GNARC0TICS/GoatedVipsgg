
import React from 'react';
import { useLocation } from 'wouter';
import { useUser } from '@/hooks/use-user';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isLoading } = useUser();
  const [, navigate] = useLocation();

  React.useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate('/login');
      } else if (requireAdmin && !user.isAdmin) {
        navigate('/');
      }
    }
  }, [user, isLoading, navigate, requireAdmin]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (!user || (requireAdmin && !user.isAdmin)) {
    return null;
  }

  return <>{children}</>;
}
