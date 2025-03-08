import { ReactNode, useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, Bell, Settings, User, LogOut, ChevronDown, Gift, Lock } from "lucide-react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SelectUser } from "@db/schema";
import { ScrollToTop } from "@/components/ScrollToTop";
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
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from 'framer-motion';
import { MobileAdminBadge } from "@/components/MobileAdminBadge";
import { AuthModal } from '@/frontend/components/common/modals';
import { FloatingSupport } from '@/frontend/components/common/support';

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
  content: "w-56 bg-brand-dark/95 backdrop-blur-xl border border-brand-light/30 rounded-xl shadow-tooltip py-2 px-1",
  item: "px-4 py-2.5 font-bold text-white hover:text-brand-yellow hover:bg-brand-light/30 rounded-lg transition-medium cursor-pointer",
  itemWithIcon: "px-4 py-2.5 font-bold text-white hover:text-brand-yellow hover:bg-brand-light/30 rounded-lg transition-medium cursor-pointer flex items-center gap-2",
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
  const [location, navigate] = useLocation();
  const isActive = location === href;
  const isHome = href === "/";

  // Function to handle navigation
  const handleNavigation = (e: React.MouseEvent) => {
    e.preventDefault();
    onClose();
    navigate(href);
  };

  return (
    <Link href={href} onClick={handleNavigation}>
      <motion.div
        whileTap={{ scale: 0.98 }}
        className={`px-4 py-3 rounded-lg transition-medium cursor-pointer ${
          isActive ? "bg-brand-yellow/10 text-brand-yellow" : "text-white hover:bg-brand-light/30"
        } ${isTitle || isHome ? "text-base font-bold" : "text-sm"} mb-1`}
      >
        {label}
      </motion.div>
    </Link>
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

// Main Layout Component
export function Layout({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const footerRef = useRef<HTMLElement>(null);
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const [showFloatingSupport, setShowFloatingSupport] = useState(true);
  const { toast } = useToast();
  const [openMobile, setOpenMobile] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const queryClient = useQueryClient();

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
      
      // Use react query to invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      // Use Wouter's navigate for client-side navigation
      navigate('/');
      
      toast({
        title: "Success",
        description: "You have been logged out successfully.",
      });
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
                  <div className="flex items-center gap-2 font-heading text-white hover:text-brand-yellow transition-colors duration-300">
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
                  className="flex items-center gap-1 font-heading text-white hover:text-brand-yellow transition-colors duration-300 hover:bg-transparent px-2"
                >
                  <span className="font-bold">GET STARTED</span>
                  <ChevronDown className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
                </Button>
                <div className="absolute left-0 mt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-in-out">
                  <div className="bg-[#1A1B21]/95 backdrop-blur-xl border border-[#2A2B31] rounded-xl shadow-2xl py-2 px-1">
                    <Link href="/how-it-works">
                      <div className="px-4 py-2.5 font-bold text-white hover:text-brand-yellow hover:bg-brand-light/30 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                            How It Works
                          </span>
                        </span>
                      </div>
                    </Link>
                    <Link href="/vip-transfer">
                      <div className="px-4 py-2.5 font-bold text-white hover:text-brand-yellow hover:bg-brand-light/30 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                            VIP Transfer
                          </span>
                        </span>
                      </div>
                    </Link>
                    <Link href="/tips-and-strategies">
                      <div className="px-4 py-2.5 font-bold text-white hover:text-brand-yellow hover:bg-brand-light/30 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                            Tips & Strategies
                          </span>
                        </span>
                      </div>
                    </Link>
                    <Link href="/vip-program">
                      <div className="px-4 py-2.5 font-bold text-white hover:text-brand-yellow hover:bg-brand-light/30 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
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
                  className="flex items-center gap-1 font-heading text-white hover:text-brand-yellow transition-colors duration-300 hover:bg-transparent px-2"
                >
                  <span className="font-bold">PROMOTIONS</span>
                  <ChevronDown className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
                </Button>
                <div className="absolute left-0 mt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-in-out">
                  <div className="bg-[#1A1B21]/95 backdrop-blur-xl border border-[#2A2B31] rounded-xl shadow-2xl py-2 px-1">
                    <Link href="/promotions">
                      <div className="px-4 py-2.5 font-bold text-white hover:text-brand-yellow hover:bg-brand-light/30 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                            News & Promotions
                          </span>
                        </span>
                      </div>
                    </Link>
                    <Link href="/goated-token">
                      <div className="px-4 py-2.5 font-bold text-white hover:text-brand-yellow hover:bg-brand-light/30 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                            Goated Airdrop
                          </span>
                        </span>
                      </div>
                    </Link>
                    <Link href="/bonus-codes">
                      <div className="px-4 py-2.5 font-bold text-white hover:text-brand-yellow hover:bg-brand-light/30 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
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
                  className="flex items-center gap-1 font-heading text-white hover:text-brand-yellow transition-colors duration-300 hover:bg-transparent px-2"
                >
                  <span className="font-bold">LEADERBOARDS</span>
                  <ChevronDown className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
                </Button>
                <div className="absolute left-0 mt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-in-out">
                  <div className="bg-[#1A1B21]/95 backdrop-blur-xl border border-[#2A2B31] rounded-xl shadow-2xl py-2 px-1">
                    <Link href="/leaderboard?period=daily">
                      <div className="px-4 py-2.5 font-bold text-white hover:text-brand-yellow hover:bg-brand-light/30 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                            Daily
                          </span>
                        </span>
                      </div>
                    </Link>
                    <Link href="/leaderboard?period=weekly">
                      <div className="px-4 py-2.5 font-bold text-white hover:text-brand-yellow hover:bg-brand-light/30 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                            Weekly
                          </span>
                        </span>
                      </div>
                    </Link>
                    <Link href="/leaderboard?period=monthly">
                      <div className="px-4 py-2.5 font-bold text-white hover:text-brand-yellow hover:bg-brand-light/30 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                            Monthly
                          </span>
                        </span>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* User section */}
          <div className={headerClasses.userSection}>
            {isAuthenticated ? (
              <>
                {/* Notifications button */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link href="/notification-preferences">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:text-brand-yellow hover:bg-brand-light/20"
                        >
                          <Bell className="h-5 w-5" />
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Notifications</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* User dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="hover:bg-brand-light/20 rounded-lg p-1"
                    >
                      <div className="h-8 w-8 rounded-full bg-brand-yellow flex items-center justify-center text-brand-dark font-bold">
                        {user?.username?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className={dropdownClasses.content}
                    align="end"
                  >
                    <DropdownMenuLabel className="px-4 py-2 text-white font-heading">
                      {user?.username}
                      {user?.is_admin && (
                        <div className="text-brand-yellow text-xs font-mono mt-1">
                          ADMIN ACCESS
                        </div>
                      )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-brand-light/30" />
                    <DropdownMenuItem
                      className={dropdownClasses.itemWithIcon}
                      asChild
                    >
                      <Link href="/profile">
                        <div className="flex items-center w-full">
                          <User className="mr-2 h-4 w-4" />
                          <span>Profile</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className={dropdownClasses.itemWithIcon}
                      asChild
                    >
                      <Link href="/settings">
                        <div className="flex items-center w-full">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    {user?.is_admin && (
                      <DropdownMenuItem
                        className={dropdownClasses.itemWithIcon}
                        asChild
                      >
                        <Link href="/admin/dashboard">
                          <div className="flex items-center w-full">
                            <Lock className="mr-2 h-4 w-4" />
                            <span>Admin Panel</span>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="bg-brand-light/30" />
                    <DropdownMenuItem
                      className={dropdownClasses.itemWithIcon}
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button 
                  variant="default" 
                  className="bg-brand-yellow text-black font-bold hover:bg-brand-yellow/90"
                  onClick={() => setAuthModalOpen(true)}
                >
                  Sign In
                </Button>
                <AuthModal 
                  isOpen={authModalOpen} 
                  onClose={() => setAuthModalOpen(false)}
                  defaultMode="login"
                />
              </>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                className={headerClasses.menuButton}
                onClick={() => setOpenMobile(true)}
              >
                <Menu className="h-5 w-5 text-white group-hover:text-brand-yellow" />
              </Button>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Menu Sheet */}
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          side="left"
          className="w-[85%] bg-[#1A1B21]/95 backdrop-blur-xl border-r border-[#2A2B31] p-0"
        >
          <div className="px-4 py-8 overflow-y-auto h-full flex flex-col">
            <div className="mb-4 px-4 flex items-center justify-between">
              <Link href="/">
                <img
                  src="/images/logo-neon.png"
                  alt="GOATED"
                  className="h-8 w-auto"
                  onClick={() => setOpenMobile(false)}
                />
              </Link>
            </div>

            {isAuthenticated && (
              <div className="mb-6 px-4">
                <div className="p-4 rounded-xl bg-brand-light/10 border border-brand-light/20">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-brand-yellow flex items-center justify-center text-brand-dark font-bold text-lg">
                      {user?.username?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <div className="font-heading text-white">
                        {user?.username}
                      </div>
                      {user?.is_admin && <MobileAdminBadge />}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Link href="/profile">
                      <Button
                        variant="outline"
                        className="w-full flex items-center gap-2 border-brand-light/20 bg-transparent text-white hover:bg-brand-light/20 hover:text-brand-yellow"
                        onClick={() => setOpenMobile(false)}
                      >
                        <User className="h-4 w-4" />
                        Profile
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      className="w-full flex items-center gap-2 border-brand-light/20 bg-transparent text-white hover:bg-brand-light/20 hover:text-brand-yellow"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1 px-1 mb-4">
              <MobileNavLink
                href="/"
                label="Home"
                onClose={() => setOpenMobile(false)}
                isTitle
              />
              <MobileNavLink
                href="/wager-races"
                label={
                  <div className="flex items-center gap-2">
                    <span>Monthly Race</span>
                    <div className="flex items-center gap-1">
                      <div className="h-1.5 w-1.5 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-xs text-red-500">LIVE</span>
                    </div>
                  </div>
                }
                onClose={() => setOpenMobile(false)}
                isTitle
              />
              <MobileNavLink
                href="/leaderboard?period=daily"
                label="Leaderboards"
                onClose={() => setOpenMobile(false)}
                isTitle
              />
              <MobileNavLink
                href="/promotions"
                label="Promotions"
                onClose={() => setOpenMobile(false)}
                isTitle
              />
              <MobileNavLink
                href="/how-it-works"
                label="How It Works"
                onClose={() => setOpenMobile(false)}
                isTitle
              />
              <MobileNavLink
                href="/vip-program"
                label="VIP Program"
                onClose={() => setOpenMobile(false)}
                isTitle
              />
            </div>
            
            <div className="mt-2 mb-4 px-4">
              <div className="font-heading text-[#8A8B91] uppercase text-sm mb-2">
                More Pages
              </div>
              <div className="space-y-1">
                <MobileNavLink
                  href="/vip-transfer"
                  label="VIP Transfer"
                  onClose={() => setOpenMobile(false)}
                />
                <MobileNavLink
                  href="/tips-and-strategies"
                  label="Tips & Strategies"
                  onClose={() => setOpenMobile(false)}
                />
                <MobileNavLink
                  href="/provably-fair"
                  label="Provably Fair"
                  onClose={() => setOpenMobile(false)}
                />
                <MobileNavLink
                  href="/goated-token"
                  label="Goated Airdrop"
                  onClose={() => setOpenMobile(false)}
                />
                <MobileNavLink
                  href="/telegram"
                  label="Telegram Bot"
                  onClose={() => setOpenMobile(false)}
                />
                <MobileNavLink
                  href="/help"
                  label="Help Center"
                  onClose={() => setOpenMobile(false)}
                />
                <MobileNavLink
                  href="/bonus-codes"
                  label={
                    isAuthenticated ? (
                      "Bonus Codes"
                    ) : (
                      <div className="flex items-center gap-2 opacity-50">
                        <span>Bonus Codes</span>
                        <Lock className="h-3 w-3" />
                      </div>
                    )
                  }
                  onClose={() => setOpenMobile(false)}
                />
              </div>
            </div>

            {!isAuthenticated && (
              <div className="mt-auto px-4">
                <Button
                  className="w-full bg-brand-yellow hover:bg-brand-yellow/90 text-brand-dark font-bold"
                  onClick={() => {
                    setOpenMobile(false);
                    // Open auth modal directly
                    setAuthModalOpen(true);
                  }}
                >
                  Sign In
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="pt-16 md:pt-20 flex-grow flex flex-col">
        {children}
      </main>

      {/* Footer */}
      <footer
        ref={footerRef}
        className={footerClasses.wrapper}
      >
        <div className={footerClasses.container}>
          <div className={footerClasses.grid}>
            <div>
              <img src="/images/Goated Logo - Black.png" alt="GOATED" className="h-20 w-auto mb-8" />
              <p className="text-brand-dark max-w-md mb-4">
                Join our community of players at GOATED, where your wagering transforms into rewards. Compete in exclusive wager races, claim daily bonus codes, and earn monthly payouts.
              </p>

              <div className={footerClasses.socialContainer}>
                <a href="https://twitter.com/goatedofficial" target="_blank" rel="noopener noreferrer" className={footerClasses.socialIcon}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M5.026 15c6.038 0 9.341-5.003 9.341-9.334 0-.14 0-.282-.006-.422A6.685 6.685 0 0 0 16 3.542a6.658 6.658 0 0 1-1.889.518 3.301 3.301 0 0 0 1.447-1.817 6.533 6.533 0 0 1-2.087.793A3.286 3.286 0 0 0 7.875 6.03a9.325 9.325 0 0 1-6.767-3.429 3.289 3.289 0 0 0 1.018 4.382A3.323 3.323 0 0 1 .64 6.575v.045a3.288 3.288 0 0 0 2.632 3.218 3.203 3.203 0 0 1-.865.115 3.23 3.23 0 0 1-.614-.057 3.283 3.283 0 0 0 3.067 2.277A6.588 6.588 0 0 1 .78 13.58a6.32 6.32 0 0 1-.78-.045A9.344 9.344 0 0 0 5.026 15z"/>
                  </svg>
                </a>
                <a href="https://t.me/GoatedOfficial" target="_blank" rel="noopener noreferrer" className={footerClasses.socialIcon}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.287 5.906a.865.865 0 0 0-.72-.376.865.865 0 0 0-.72.375l-1.245 1.5a.25.25 0 0 1-.397-.012L4.28 6.336a.25.25 0 0 0-.405.098l-.835 2.502a.25.25 0 0 0 .348.301l1.077-.4a.25.25 0 0 1 .293.089l.862 1.293a.25.25 0 0 0 .415.012l2.664-3.237a.25.25 0 0 0-.034-.334z"/>
                  </svg>
                </a>
                <a href="https://discord.gg/goatedofficial" target="_blank" rel="noopener noreferrer" className={footerClasses.socialIcon}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M13.545 2.907a13.227 13.227 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.19 12.19 0 0 0-3.658 0 8.258 8.258 0 0 0-.412-.833.051.051 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.041.041 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032c.001.014.01.028.021.037a13.276 13.276 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019c.308-.42.582-.863.818-1.329a.05.05 0 0 0-.01-.059.051.051 0 0 0-.018-.011 8.875 8.875 0 0 1-1.248-.595.05.05 0 0 1-.02-.066.051.051 0 0 1 .015-.019c.084-.063.168-.129.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.052.052 0 0 1 .053.007c.08.066.164.132.248.195a.051.051 0 0 1-.004.085 8.254 8.254 0 0 1-1.249.594.05.05 0 0 0-.03.03.052.052 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019c1.321-.436 2.585-1.127 3.99-2.02a.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.034.034 0 0 0-.02-.019Zm-8.198 7.307c-.789 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612Zm5.316 0c-.788 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612Z"/>
                  </svg>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <h3 className={footerClasses.heading}>Links</h3>
                <div className={footerClasses.linkGroup}>
                  <Link href="/how-it-works" className={footerClasses.link}>How It Works</Link>
                  <Link href="/vip-program" className={footerClasses.link}>VIP Program</Link>
                  <Link href="/wager-races" className={footerClasses.link}>Wager Races</Link>
                  <Link href="/leaderboard?period=daily" className={footerClasses.link}>Leaderboards</Link>
                  <Link href="/promotions" className={footerClasses.link}>Promotions</Link>
                  <Link href="/vip-transfer" className={footerClasses.link}>VIP Transfer</Link>
                </div>
              </div>
              <div>
                <h3 className={footerClasses.heading}>Support</h3>
                <div className={footerClasses.linkGroup}>
                  <Link href="/help" className={footerClasses.link}>Help Center</Link>
                  <Link href="/support" className={footerClasses.link}>Contact Support</Link>
                  <Link href="/faq" className={footerClasses.link}>FAQs</Link>
                  <Link href="/terms" className={footerClasses.link}>Terms of Service</Link>
                  <Link href="/privacy" className={footerClasses.link}>Privacy Policy</Link>
                  <Link href="/provably-fair" className={footerClasses.link}>Provably Fair</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-brand-dark/20 text-center">
            <p className="text-brand-dark text-sm">
              © {new Date().getFullYear()} GOATED. All rights reserved. 18+ Gamble Responsibly.
            </p>
          </div>
        </div>
      </footer>

      {/* Floating support button */}
      {showFloatingSupport && !isFooterVisible && (
        <FloatingSupport onClose={() => setShowFloatingSupport(false)} />
      )}

      {/* ScrollToTop component */}
      <ScrollToTop />
    </div>
  );
}