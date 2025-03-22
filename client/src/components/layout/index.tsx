import { ReactNode, useRef, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Header } from "./header";
import { Footer } from "./footer";
import { ScrollToTop } from "@/components/ScrollToTop";
import { FloatingSupport } from "@/components/FloatingSupport";
import { MobileAdminBadge } from "@/components/MobileAdminBadge";
import { ScrollToTopNavigation } from "@/components/ScrollToTopNavigation";
import { useResponsive } from "./hooks/useResponsive";
import type { SelectUser } from "@db/schema";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const footerRef = useRef<HTMLElement>(null);
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const [showFloatingSupport, setShowFloatingSupport] = useState(true);
  const { toast } = useToast();
  const { isMobile } = useResponsive();

  const { data: user } = useQuery<SelectUser>({
    queryKey: ["/api/user"],
  });

  // Reset scroll position when location changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  // Check if footer is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsFooterVisible(entry.isIntersecting),
      { threshold: 0.1 },
    );

    if (footerRef.current) {
      observer.observe(footerRef.current);
      return () => observer.unobserve(footerRef.current!);
    }
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Logout failed");
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#14151A] text-white">
      <ScrollToTopNavigation />
      <Header user={user} onLogout={handleLogout} />

      <main className="flex-grow pt-16">
        {children}
        {user?.isAdmin && isMobile && <MobileAdminBadge />}
      </main>

      {showFloatingSupport && (
        <FloatingSupport onClose={() => setShowFloatingSupport(false)} />
      )}

      <ScrollToTop />

      <Footer footerRef={footerRef} />
    </div>
  );
}
