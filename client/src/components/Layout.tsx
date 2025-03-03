import { ReactNode, useState, useRef, useEffect, Fragment } from "react";
import { Link, useLocation } from "wouter";
import { Menu, Bell, Settings, User, LogOut, ChevronDown, Gift, Lock } from "lucide-react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import AuthModal from "@/components/AuthModal";
import { useQuery } from "@tanstack/react-query";
import type { SelectUser } from "@db/schema";
import { ScrollToTop } from "./ScrollToTop";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FloatingSupport } from "./FloatingSupport";
import { useToast } from "@/hooks/use-toast";
import { motion } from 'framer-motion';
import { MobileAdminBadge } from "@/components/MobileAdminBadge";

// Enhanced header styling with improved spacing and responsive behavior
const headerClasses = {
  container: "fixed top-0 left-0 right-0 z-50 bg-brand-dark/90 backdrop-blur-xl border-b border-brand-light/50 shadow-card",
  nav: "container mx-auto h-16 md:h-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between",
  logo: "h-8 md:h-10 w-auto relative transition-medium hover-scale",
  menuButton: "md:hidden relative overflow-hidden group p-2 hover:bg-brand-light/20 rounded-lg transition-medium",
  desktopNav: "hidden md:flex items-center gap-2 lg:gap-6",
  userSection: "flex items-center gap-2 sm:gap-4",
};

// Enhanced dropdown styling with consistent spacing
const dropdownClasses = {
  content: "w-56 bg-brand-dark/95 backdrop-blur-xl border border-brand-light rounded-xl shadow-tooltip py-2 px-1",
  item: "px-4 py-2.5 font-bold text-white hover:text-brand-yellow hover:bg-brand-light/50 rounded-lg transition-medium cursor-pointer",
  itemWithIcon: "px-4 py-2.5 font-bold text-white hover:text-brand-yellow hover:bg-brand-light/50 rounded-lg transition-medium cursor-pointer flex items-center gap-2",
};

// Enhanced footer styling with improved spacing
const footerClasses = {
  wrapper: "bg-brand-yellow relative mt-auto",
  container: "container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 lg:py-20",
  grid: "grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16",
  heading: "font-heading text-brand-dark text-xl md:text-2xl font-bold mb-4",
  linkGroup: "space-y-3 md:space-y-4",
  link: "text-brand-dark hover:text-brand-darker font-medium transition-medium inline-block",
  socialContainer: "flex items-center gap-4 mt-6",
  socialIcon: "w-8 h-8 flex items-center justify-center bg-brand-dark text-brand-yellow rounded-full hover:scale-110 transition-medium",
};

function MobileNavLink({ href, label, onClose, isTitle = false }: { href: string; label: string | React.ReactNode; onClose: () => void; isTitle?: boolean; }) {
  const [location] = useLocation();
  const isActive = location === href;
  const isHome = href === "/";

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={(e) => {
        e.preventDefault();
        onClose();
        window.location.href = href;
      }}
      className={`px-4 py-3 rounded-lg transition-medium cursor-pointer ${
        isActive ? "bg-brand-yellow/10 text-brand-yellow" : "text-white hover:bg-brand-light/30"
      } ${isTitle || isHome ? "text-base font-bold" : "text-sm"} mb-1`}
    >
      {label}
    </motion.div>
  );
}



// Main Layout Component
export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const footerRef = useRef<HTMLElement>(null);
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const [showFloatingSupport, setShowFloatingSupport] = useState(true);
  const { toast } = useToast();
  const [openMobile, setOpenMobile] = useState(false);

  const { data: user } = useQuery<SelectUser>({
    queryKey: ["/api/user"],
  });

  const isAuthenticated = !!user;
  const isMobile = window.innerWidth < 768; // Basic mobile detection

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsFooterVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );

    const footerElement = footerRef.current;
    if (footerElement) {
      observer.observe(footerElement);
      return () => {
        try {
          // Only unobserve if the element is still valid
          if (footerElement instanceof Element) {
            observer.unobserve(footerElement);
          }
          observer.disconnect();
        } catch (error) {
          console.error('Error during IntersectionObserver cleanup:', error);
        }
      };
    }
    return () => observer.disconnect();
  }, []);

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
    <div className="min-h-screen flex flex-col bg-brand-dark">
      <header className={headerClasses.container}>
        <nav className={headerClasses.nav}>
          {/* Navigation content */}
          <div className="flex items-center gap-8">
            <Link href="/">
              <img src="/images/logo-neon.png" alt="GOATED" className={headerClasses.logo} />
            </Link>

            {/* Desktop Navigation */}
            <div className={headerClasses.desktopNav}>
              <NavLink href="/" label="HOME" />
              <NavLink
                href="/wager-races"
                label={
                  <div className="flex items-center gap-2 font-heading text-white hover:text-[#D7FF00] transition-colors duration-300">
                    <span>MONTHLY RACE</span>
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-xs text-red-500">LIVE</span>
                    </div>
                  </div>
                }
              />
              {/* GET STARTED dropdown */}
              <div className="relative group">
                <Button
                  variant="ghost"
                  className="flex items-center gap-1 font-heading text-white hover:text-[#D7FF00] transition-colors duration-300 hover:bg-transparent px-2"
                  onClick={() => window.location.href = "/how-it-works"}
                >
                  <span className="font-bold">GET STARTED</span>
                  <ChevronDown className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
                </Button>
                <div className="absolute left-0 mt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-in-out">
                  <div className="bg-[#1A1B21]/95 backdrop-blur-xl border border-[#2A2B31] rounded-xl shadow-2xl py-2 px-1">
                    <Link href="/how-it-works">
                      <div className="px-4 py-2.5 font-bold text-white hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                            How It Works
                          </span>
                        </span>
                      </div>
                    </Link>
                    <Link href="/vip-transfer">
                      <div className="px-4 py-2.5 font-bold text-white hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                            VIP Transfer
                          </span>
                        </span>
                      </div>
                    </Link>
                    <Link href="/tips-and-strategies">
                      <div className="px-4 py-2.5 font-bold text-white hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                            Tips & Strategies
                          </span>
                        </span>
                      </div>
                    </Link>
                    <Link href="/vip-program">
                      <div className="px-4 py-2.5 font-bold text-white hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                            VIP Program
                          </span>
                        </span>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Promotions dropdown */}
              <div className="relative group">
                <Button
                  variant="ghost"
                  className="flex items-center gap-1 font-heading text-white hover:text-[#D7FF00] transition-colors duration-300 hover:bg-transparent px-2"
                  onClick={() => window.location.href = "/promotions"}
                >
                  <span className="font-bold">PROMOTIONS</span>
                  <ChevronDown className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
                </Button>
                <div className="absolute left-0 mt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-in-out">
                  <div className="bg-[#1A1B21]/95 backdrop-blur-xl border border-[#2A2B31] rounded-xl shadow-2xl py-2 px-1">
                    <Link href="/promotions">
                      <div className="px-4 py-2.5 font-bold text-white hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                            News & Promotions
                          </span>
                        </span>
                      </div>
                    </Link>
                    <Link href="/goated-token">
                      <div className="px-4 py-2.5 font-bold text-white hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                            Goated Airdrop
                          </span>
                        </span>
                      </div>
                    </Link>
                    <Link href="/bonus-codes">
                      <div className="px-4 py-2.5 font-bold text-white hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                        <span className="relative flex items-center gap-2">
                          <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                            {isAuthenticated ? (
                              "Bonus Codes"
                            ) : (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger className="flex items-center gap-2 opacity-50 cursor-not-allowed">
                                    <span>Bonus Codes</span>
                                    <Lock className="h-4 w-4" />
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-[#1A1B21] border-[#2A2B31] text-white">
                                    <p>Sign in to access bonus codes and rewards</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </span>
                          <Gift className="h-4 w-4" />
                        </span>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Updated Leaderboard dropdown with hover functionality */}
              <div className="relative group">
                <Button
                  variant="ghost"
                  className="flex items-center gap-1 font-heading text-white hover:text-[#D7FF00] transition-colors duration-300 hover:bg-transparent px-2"
                  onClick={() => window.location.href = "/leaderboard?period=daily"}
                >
                  <span className="font-bold">LEADERBOARDS</span>
                  <ChevronDown className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
                </Button>
                <div className="absolute left-0 mt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-in-out">
                  <div className="bg-[#1A1B21]/95 backdrop-blur-xl border border-[#2A2B31] rounded-xl shadow-2xl py-2 px-1">
                    <Link href="/leaderboard?period=daily">
                      <div className="px-4 py-2.5 font-bold text-white hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                            Daily
                          </span>
                        </span>
                      </div>
                    </Link>
                    <Link href="/leaderboard?period=weekly">
                      <div className="px-4 py-2.5 font-bold text-white hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                            Weekly
                          </span>
                        </span>
                      </div>
                    </Link>
                    <Link href="/leaderboard?period=monthly">
                      <div className="px-4 py-2.5 font-bold text-white hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                            Monthly
                          </span>
                        </span>
                      </div>
                    </Link>
                    <Link href="/leaderboard?period=all_time">
                      <div className="px-4 py-2.5 font-bold text-white hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                            All Time
                          </span>
                        </span>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
              {/* Socials dropdown */}
              <div className="relative group">
                <Button
                  variant="ghost"
                  className="flex items-center gap-1 font-heading text-white hover:text-[#D7FF00] transition-colors duration-300 hover:bg-transparent px-2"
                  onClick={() => window.location.href = "/socials"}
                >
                  <span className="font-bold">SOCIALS</span>
                  <ChevronDown className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
                </Button>
                <div className="absolute left-0 mt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-in-out">
                  <div className="bg-[#1A1B21]/95 backdrop-blur-xl border border-[#2A2B31] rounded-xl shadow-2xl py-2 px-1">
                    <Link href="/telegram">
                      <div className="px-4 py-2.5 font-bold text-white hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                            Telegram Community
                          </span>
                        </span>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Help/FAQ dropdown */}
              <div className="relative group">
                <Button
                  variant="ghost"
                  className="flex items-center gap-1 font-heading text-white hover:text-[#D7FF00] transition-colors duration-300 hover:bg-transparent px-2"
                  onClick={() => window.location.href = "/help"}
                >
                  <span className="font-bold">HELP & FAQ</span>
                  <ChevronDown className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
                </Button>
                <div className="absolute left-0 mt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-in-out">
                  <div className="bg-[#1A1B21]/95 backdrop-blur-xl border border-[#2A2B31] rounded-xl shadow-2xl py-2 px-1">
                    <Link href="/help">
                      <div className="px-4 py-2.5 font-bold text-white hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                            Help Center
                          </span>
                        </span>
                      </div>
                    </Link>
                    <Link href="/faq">
                      <div className="px-4 py-2.5 font-bold text-white hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                            FAQ
                          </span>
                        </span>
                      </div>
                    </Link>
                    <Link href="/support">
                      <div className="px-4 py-2.5 font-bold text-white hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                            Contact Support
                          </span>
                        </span>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>

              {user?.isAdmin && (
                <div className="relative group">
                  <Button
                    variant="ghost"
                    className="flex items-center gap-1 font-heading text-white hover:text-[#D7FF00] transition-colors duration-300 hover:bg-transparent px-2"
                  >
                    <span className="font-bold">ADMIN</span>
                    <ChevronDown className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
                  </Button>
                  <div className="absolute left-0 mt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-in-out">
                    <div className="bg-[#1A1B21]/95 backdrop-blur-xl border border-[#2A2B31] rounded-xl shadow-2xl py-2 px-1">
                      <Link href="/admin/user-management">
                        <div className="px-4 py-2.5 font-bold text-white hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer">
                          User Management
                        </div>
                      </Link>
                      <Link href="/admin/notifications">
                        <div className="px-4 py-2.5 font-bold text-white hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer">
                          Notification Management
                        </div>
                      </Link>
                      <Link href="/admin/support">
                        <div className="px-4 py-2.5 font-bold text-white hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer">
                          Support Management
                        </div>
                      </Link>
                      <Link href="/admin/wager-races">
                        <div className="px-4 py-2.5 font-bold text-white hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer">
                          Wager Race Management
                        </div>
                      </Link>
                      <Link href="/admin/bonus-codes">
                        <div className="px-4 py-2.5 font-bold text-white hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer">
                          Bonus Code Management
                        </div>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Enhanced mobile navigation */}
            <div className={headerClasses.menuButton}>
              <Sheet open={openMobile} onOpenChange={setOpenMobile}>
                <SheetPrimitive.Trigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative overflow-hidden group rounded-lg p-2.5"
                  >
                    <div className="absolute inset-0 bg-brand-yellow/10 transform scale-x-0 group-hover:scale-x-100 transition-medium origin-left rounded-lg" />
                    <Menu className="h-6 w-6 text-white relative z-10 group-hover:text-brand-yellow transition-medium" />
                  </Button>
                </SheetPrimitive.Trigger>
                <SheetContent
                  side="left"
                  className="w-[320px] bg-brand-dark border-r border-brand-light/30 overflow-y-auto p-0 shadow-xl"
                >
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col gap-4 pt-8"
                  >
                    <div className="px-4 py-2 text-[#D7FF00] font-heading text-base font-bold">MENU</div>
                    <MobileNavLink href="/" label="HOME" onClose={() => setOpenMobile(false)} isTitle={true} />

                    <div className="mt-6 px-4 py-2 text-[#D7FF00] font-heading text-sm font-bold border-t border-[#2A2B31]/50 pt-6">EVENTS</div>
                    <MobileNavLink
                      href="/wager-races"
                      label={
                        <div className="flex items-center justify-between w-full">
                          <span>Monthly Race</span>
                          <div className="ml-2 flex items-center gap-1">
                            <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-xs text-red-500">LIVE</span>
                          </div>
                        </div>
                      }
                      onClose={() => setOpenMobile(false)}
                    />
                    <MobileNavLink
                      href="/challenges"
                      label={
                        <div className="flex items-center justify-between w-full">
                          <span>Challenges</span>
                          <div className="ml-2 flex items-center gap-1">
                            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-xs text-green-500">ONGOING</span>
                          </div>
                        </div>
                      }
                      onClose={() => setOpenMobile(false)}
                    />

                    <div className="mt-6 px-4 py-2 text-[#D7FF00] font-heading text-sm font-bold border-t border-[#2A2B31]/50 pt-6">GET STARTED</div>
                    <MobileNavLink href="/how-it-works" label="How It Works" onClose={() => setOpenMobile(false)} />
                    <MobileNavLink href="/vip-transfer" label="VIP Transfer" onClose={() => setOpenMobile(false)} />
                    <MobileNavLink href="/tips-and-strategies" label="Tips & Strategies" onClose={() => setOpenMobile(false)} />
                    <MobileNavLink href="/vip-program" label="VIP Program" onClose={() => setOpenMobile(false)} />

                    <div className="mt-6 px-4 py-2 text-[#D7FF00] font-heading text-sm font-bold border-t border-[#2A2B31]/50 pt-6">PROMOTIONS</div>
                    <MobileNavLink href="/promotions" label="News & Promotions" onClose={() => setOpenMobile(false)} />
                    <MobileNavLink href="/goated-token" label="Goated Airdrop" onClose={() => setOpenMobile(false)} />
                    <MobileNavLink
                      href="/bonus-codes"
                      label={
                        isAuthenticated ? (
                          <div className="flex items-center gap-2">
                            <span>Bonus Codes</span>
                            <Gift className="h-4 w-4" />
                          </div>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="flex items-center gap-2 opacity-50 cursor-not-allowed">
                                <span>Bonus Codes</span>
                                <Lock className="h-4 w-4" />
                              </TooltipTrigger>
                              <TooltipContent className="bg-[#1A1B21] border-[#2A2B31] text-white">
                                <p>Sign in to access bonus codes and rewards</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )
                      }
                      onClose={() => setOpenMobile(false)}
                    />

                    <div className="mt-6 px-4 py-2 text-[#D7FF00] font-heading text-sm font-bold border-t border-[#2A2B31]/50 pt-6">LEADERBOARDS</div>
                    <MobileNavLink
                      href="/leaderboard?period=daily"
                      label="Daily Leaderboard"
                      onClose={() => setOpenMobile(false)}
                    />
                    <MobileNavLink
                      href="/leaderboard?period=weekly"
                      label="Weekly Leaderboard"
                      onClose={() => setOpenMobile(false)}
                    />
                    <MobileNavLink
                      href="/leaderboard?period=monthly"
                      label="Monthly Leaderboard"
                      onClose={() => setOpenMobile(false)}
                    />
                    <MobileNavLink
                      href="/leaderboard?period=all-time"
                      label="All Time Leaderboard"
                      onClose={() => setOpenMobile(false)}
                    />


                    <div className="mt-6 px-4 py-2 text-[#D7FF00] font-heading text-sm font-bold border-t border-[#2A2B31]/50 pt-6">SOCIALS</div>
                    <MobileNavLink href="/telegram" label="Telegram Community" onClose={() => setOpenMobile(false)} />

                    <div className="mt-6 px-4 py-2 text-[#D7FF00] font-heading text-sm font-bold border-t border-[#2A2B31]/50 pt-6">HELP & SUPPORT</div>
                    <MobileNavLink href="/help" label="Help Center" onClose={() => setOpenMobile(false)} />
                    <MobileNavLink href="/faq" label="FAQ" onClose={() => setOpenMobile(false)} />
                    <MobileNavLink href="/support" label="Contact Support" onClose={() => setOpenMobile(false)} />

                    {user?.isAdmin && (
                      <>
                        <div className="mt-6 px-4 py-2 text-[#D7FF00] font-heading text-sm font-bold border-t border-[#2A2B31]/50 pt-6">ADMIN</div>
                        <MobileNavLink href="/admin/user-management" label="UserManagement" onClose={() => setOpenMobile(false)} />
                        <MobileNavLink href="/admin/wager-races" label="Wager Race Management" onClose={() => setOpenMobile(false)} />
                        <MobileNavLink href="/admin/bonus-codes" label="Bonus Code Management" onClose={() => setOpenMobile(false)} />
                      </>
                    )}

                    <div className="mt-6 px-4 border-t border-[#2A2B31]/50 pt-6">
                      <Button
                        onClick={() => {
                          setOpenMobile(false);
                          window.open("https://www.goated.com/r/SPIN", "_blank");
                        }}
                        className="w-full bg-[#D7FF00] text-[#14151A] hover:bg-[#D7FF00]/90 transition-colors font-bold"
                      >
                        <span className="flex items-center justify-center gap-1">
                          PLAY NOW
                          <img 
                            src="/images/Goated Logo - Black.png" 
                            alt="Goated" 
                            className="w-4 h-4 inline-block" 
                          />
                        </span>
                      </Button>
                    </div>
                  </motion.div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* User section */}
          <div className={headerClasses.userSection}>
            <div>
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-[#8A8B91] hover:text-white relative h-8 w-8 md:h-10 md:w-10"
                    >
                      <Bell className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80 bg-[#1A1B21] border-[#2A2B31]">
                    <DropdownMenuLabel className="flex items-center justify-between">
                      Notifications
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          window.open("/notification-preferences", "_self")
                        }
                        className="h-8 w-8"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="max-h-[300px] overflow-y-auto">
                      {/* Active notifications */}
                      <DropdownMenuItem className="flex flex-col items-start gap-1 py-3 text-white">
                        <div className="text-sm font-medium">
                          Monthly Wager Race Live!
                        </div>
                        <div className="text-xs text-[#8A8B91]">
                          Compete for a share of the $2000 prize pool - Join now!
                        </div>
                        <div className="text-xs text-[#8A8B91]">
                          Just now
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="flex flex-col items-start gap-1 py-3 text-white">
                        <div className="text-sm font-medium">
                          Welcome to GoatedVIPs!
                        </div>
                        <div className="text-xs text-[#8A8B91]">
                          Your #1 source for casino rewards and competitions
                        </div>
                        <div className="text-xs text-[#8A8B91]">2 days ago</div>
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <div className="flex items-center gap-2 md:gap-4">
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="flex items-center gap-1 md:gap-2 text-white px-2 md:px-4 h-8 md:h-10"
                      >
                        <User className="h-5 w-5" />
                        <span className="hidden md:inline">
                          {user.username}
                        </span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 bg-[#1A1B21] border-[#2A2B31]">
                      <DropdownMenuLabel className="text-white">My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <Link href={`/user/${user.id}`}>
                        <DropdownMenuItem className="cursor-pointer text-white">
                          Profile
                        </DropdownMenuItem>
                      </Link>
                      <Link href="/notification-preferences">
                        <DropdownMenuItem className="cursor-pointer text-white">
                          Settings
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="text-red-500 cursor-pointer"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <AuthModal />
                )}
                <Button
                  onClick={() =>
                    window.open("https://www.goated.com/r/SPIN", "_blank")
                  }
                  className="relative font-heading uppercase tracking-tight bg-[#D7FF00] hover:bg-[#b2d000] text-[#14151A] border border-[#D7FF00] hover:border-[#b2d000] px-4 py-2 rounded-md transition-all duration-300 h-8 md:h-10 text-sm md:text-base"
                >
                  <span className="relative z-10 flex items-center gap-1">
                    PLAY 
                    <img 
                      src="/images/Goated Logo - Black.png" 
                      alt="Goated" 
                      className="w-4 h-4 inline-block" 
                    />
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </nav>
      </header>

      <main className="flex-grow pt-16 md:pt-20">
          <div className="layout-container">
            {children}
          </div>
        {user?.isAdmin && isMobile && <MobileAdminBadge />}
      </main>

      {showFloatingSupport && (
        <FloatingSupport onClose={() => setShowFloatingSupport(false)} />
      )}

      <ScrollToTop />

      <footer ref={footerRef} className={footerClasses.wrapper}>
        <div className="absolute inset-0 bg-gradient-to-b from-[#D7FF00]/20 to-transparent pointer-events-none" />
        <div className={footerClasses.container}>
          <div className={footerClasses.grid}>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h4 className={footerClasses.heading}>
                  Ready to get Goated?
                </h4>
                <a
                  href="https://www.goated.com/r/VIPBOOST"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transform transition-transform duration-300 hover:scale-110"
                >
                  <img
                    src="/images/Goated Logo - Black.png"
                    alt="Goated"
                    className="h-8 w-auto entrance-zoom wiggle-animation"
                  />
                </a>
              </div>
              <p className="text-[#14151A] mb-6">
                Sign up now and enjoy additional rewards from our side. Start
                your journey to becoming a casino legend!
              </p>
              <Button
                onClick={() =>
                  window.open("https://www.goated.com/r/EARLYACCESS", "_blank")
                }
                className="bg-[#14151A] text-white hover:bg-[#14151A]/90 transition-colors"
              >
                Sign Up Now
              </Button>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h4 className={footerClasses.heading}>
                  Stay Updated
                </h4>
                <a
                  href="https://t.me/+iFlHl5V9VcszZTVh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transform transition-transform duration-300 hover:scale-110"
                >
                  <img
                    src="/images/Goated logo with text.png"
                    alt="Goated"
                    className="h-[4.5rem] w-auto object-contain"
                  />
                </a>
              </div>
              <p className="text-[#14151A] mb-6">
                Subscribe to our newsletter for exclusive offers and updates!
              </p>
              <form onSubmit={(e) => e.preventDefault()} className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-2 rounded-lg border border-[#14151A]/20 focus:outline-none focus:border-[#14151A] transition-colors duration-300"
                />
                <Button className="bg-[#14151A] text-white hover:bg-[#14151A]/90">
                  Subscribe
                </Button>
              </form>
            </div>
          </div>
        </div>
        <div className="bg-[#14151A] text-[#8A8B91] text-sm py-6">
          <div className="container mx-auto px-4 text-center">
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 px-4">
                <a
                  href="https://www.goated.com/r/VIPBOOST"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transform transition-transform duration-300 hover:scale-105"
                >
                  <img
                    src="/images/Goated logo with text.png"
                    alt="Goated"
                    className="h-10 md:h-12 w-auto object-contain max-w-[200px]"
                  />
                </a>
                <a
                  href="https://t.me/+iFlHl5V9VcszZTVh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transform transition-transform duration-300 hover:scale-105"
                >
                  <img
                    src="/images/Goated logo with text1.png"
                    alt="Goated Partner"
                    className="h-10 md:h-12 w-auto object-contain max-w-[200px]"
                  />
                </a>
              </div>
            </div>
            <p className="mb-2">
              © 2024 goatedvips.replit.app. All rights reserved.
            </p>
            <p className="mb-2">
              Disclaimer: This website is not operated by Goated.com, and it's
              not an official site of the Goated.com team.
            </p>
            <p>Gamble responsibly. 18+ only. BeGambleAware.org</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ href, label, tooltip }: { href: string; label: string | React.ReactNode; tooltip?: string; }) {
  const [location] = useLocation();
  const isActive = location === href;

  const linkContent = (
    <motion.div
      className={`relative font-heading cursor-pointer ${
        isActive ? "text-brand-yellow" : "text-white"
      } hover:text-brand-yellow transition-medium`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {label}
      <motion.div
        className="absolute -bottom-1 left-0 h-0.5 bg-brand-yellow origin-left"
        initial={{ scaleX: isActive ? 1 : 0 }}
        animate={{ scaleX: isActive ? 1 : 0 }}
        whileHover={{ scaleX: 1 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={href} className="block">{linkContent}</Link>
        </TooltipTrigger>
        <TooltipContent className="bg-[#1A1B21] border-[#2A2B31] text-white">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  return <Link href={href} className="block">{linkContent}</Link>;
}