import { useEffect } from "react";
import { useLocation, Redirect } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import LoadingSpinner from "./LoadingSpinner";

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

export default function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Verify admin status on mount
    if (!isLoading && (!user || !user.isAdmin)) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You need admin privileges to access this area",
      });
    }
  }, [isLoading, user, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#14151A]">
        <LoadingSpinner />
      </div>
    );
  }

  // Redirect non-admin users
  if (!user || !user.isAdmin) {
    return <Redirect to="/admin/login" />;
  }

  return <>{children}</>;
}