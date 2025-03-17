import React, { useEffect, useState } from "react";
import { Redirect, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
// Using a simple loading indicator since we're having issues with the LoadingSpinner component

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

export default function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    async function checkAdminStatus() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/admin/verify", {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          setIsAdmin(true);
        } else {
          toast({
            variant: "destructive",
            title: "Access Denied",
            description: "You don't have admin privileges",
          });
        }
      } catch (error) {
        console.error("Error verifying admin status:", error);
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Failed to verify admin access",
        });
      } finally {
        setIsLoading(false);
      }
    }

    checkAdminStatus();
  }, [user, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D7FF00]"></div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (!isAdmin) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}