
import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useUser } from '@/hooks/use-user';
import { Loader2 } from 'lucide-react';

export default function AdminRedirect() {
  const [, navigate] = useLocation();
  const { user, isLoading } = useUser();

  useEffect(() => {
    if (!isLoading) {
      if (user && user.isAdmin) {
        navigate('/admin/dashboard');
      } else {
        navigate('/admin-login');
      }
    }
  }, [user, isLoading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="ml-2">Redirecting...</span>
    </div>
  );
}
