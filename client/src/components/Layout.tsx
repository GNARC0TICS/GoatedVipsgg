import { ReactNode, useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Menu,
  Bell,
  Settings,
  User,
  LogOut,
  Gift,
  Lock,
  ExternalLink,
} from "lucide-react";
import { LineMdPlayFilled } from "@/components/icons/LineMdPlayFilled";
// Import from the fixed sheet component
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet-fix";
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
import { MobileAdminBadge } from "@/components/MobileAdminBadge";
import { ScrollToTopNavigation } from "./ScrollToTopNavigation";

// Improved header styling
const headerClasses = {
  container:
    "fixed top-0 left-0 right-0 z-50 bg-[#14151A]/80 backdrop-blur-xl border-b border-[#2A2B31]/50 shadow-sm transition-all duration-300",
  nav: "container mx-auto h-16 px-4 flex items-center justify-between",
  logo: "h-8 w-auto relative z-10 transition-all duration-300 hover:scale-105 hover:brightness-110",
  menuButton: "md:hidden relative overflow-hidden group",
  desktopNav: "hidden md:flex items-center space-x-6",
  userSection: "flex items-center space-x-4",
};

// Consolidated dropdown styling
const dropdownClasses = {
  content:
    "w-56 bg-[#1A1B21]/95 backdrop-blur-xl border border-[#2A2B31] rounded-xl shadow-2xl py-2 px-1",
  item: "px-4 py-2 font-medium text-white hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-colors duration-200 cursor-pointer",
};

// Footer styling
const footerClasses = {
  wrapper: "bg-[#D7FF00] relative mt-auto border-t-4 border-[#2A2B31]",
  container: "container mx-auto px-4 py-16",
  grid: "grid grid-cols-1 md:grid-cols-2 gap-12",
  heading: "font-heading text-[#14151A] text-2xl font-bold",
};

// Hover effect for nav items
const hoverVariants = {
  initial: { x: 0 },
  hover: { x: 5, transition: { duration: 0.3 } },
};

function MobileNavLink({
  href,
  label,
  onClose,
  isTitle = false,
}: {
  href: string;
  label: string | React.ReactNode;
  onClose: () => void;
  isTitle?: boolean;
}) {
  const [location] = useLocation();
  const isActive = location === href;
  const isHome = href === "/";

  return (
    <motion.div
      whileHover={{ x: 8 }}
      whileTap={{ scale: 0.98 }}
      onClick={(e) => {
        e.preventDefault();
        onClose();
        window.location.href = href;
      }}
      className={`px-4 py-2.5 rounded-lg transition-all duration-200 cursor-pointer ${
        isActive
          ? "bg-[#D7FF00]/10 text-[#D7FF00]"
          : "text-white hover:bg-[#2A2B31]"
      } ${isTitle || isHome ? "text-base font-bold" : "text-sm"}`}
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
  const [isMobile, setIsMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { data: user } = useQuery<SelectUser>({
    queryKey: ["/api/user"],
  });

  const isAuthenticated = !!user;

  // Check if the screen is mobile and update on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Set initial value
    handleResize();

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Clean up
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

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
      <header
        className={`${headerClasses.container} ${scrolled ? "h-16 shadow-md" : "h-16"}`}
      >
        <nav className={headerClasses.nav}>
          {/* Navigation content */}
          <div className="flex items-center gap-8">
            <Link href="/" className="group relative">
              <img
                src="/images/logo-neon.png"
                alt="GOATED"
                className={headerClasses.logo}
              />
              <div className="absolute inset-0 bg-[#D7FF00]/0 rounded-full filter blur-md transition-all duration-300 group-hover:bg-[#D7FF00]/30 group-hover:blur-xl -z-10"></div>
            </Link>

            {/* Desktop Navigation */}
            <div className={headerClasses.desktopNav}>
              <NavLink href="/" label="HOME" />
              
              {/* GET STARTED dropdown - moved after HOME */}
              <div className="relative group">
                <Link href="/how-it-works">
                  <Button
                    variant="ghost"
                    className="flex items-center gap-1.5 font-heading text-white hover:text-[#D7FF00] transition-colors duration-300 hover:bg-transparent px-2"
                  >
                    <span className="font-bold">GET STARTED</span>
                  </Button>
                </Link>
                <div className="absolute left-0 mt-2 w-full min-w-[200px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-in-out z-50">
                  <div className="bg-[#1A1B21]/95 backdrop-blur-xl border border-[#2A2B31] rounded-xl shadow-2xl py-2 mt-1">
                    <Link href="/how-it-works">
                      <div className={dropdownClasses.item}>
                        How It Works
                      </div>
                    </Link>
                    <Link href="/vip-transfer">
                      <div className={dropdownClasses.item}>
                        VIP Transfer
                      </div>
                    </Link>
                    <Link href="/tips-and-strategies">
                      <div className={dropdownClasses.item}>
                        Tips & Strategies
                      </div>
                    </Link>
                    <Link href="/vip-program">
                      <div className={dropdownClasses.item}>
                        VIP Program
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
              <NavLink
                href="/wager-races"
                label={
                  <div className="flex items-center gap-2 font-heading text-white hover:text-[#D7FF00] transition-colors duration-300">
                    <span className="font-bold">MONTHLY RACE</span>
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-xs text-red-500">LIVE</span>
                    </div>
                  </div>
                }
              />

              {/* Promotions dropdown */}
              <div className="relative group">
                <Link href="/promotions">
                  <Button
                    variant="ghost"
                    className="flex items-center gap-1.5 font-heading text-white hover:text-[#D7FF00] transition-colors duration-300 hover:bg-transparent px-2"
                  >
                    <span className="font-bold">PROMOTIONS</span>
                  </Button>
                </Link>
                <div className="absolute left-0 mt-2 w-full min-w-[200px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-in-out z-50">
                  <div className="bg-[#1A1B21]/95 backdrop-blur-xl border border-[#2A2B31] rounded-xl shadow-2xl py-2 mt-1">
                    <Link href="/promotions">
                      <div className={dropdownClasses.item}>
                        News & Promotions
                      </div>
                    </Link>
                    <Link href="/goated-token">
                      <div className={dropdownClasses.item}>
                        Goated Airdrop
                      </div>
                    </Link>
                    <Link href="/bonus-codes">
                      <div className={dropdownClasses.item}>
                        <span className="flex items-center gap-2">
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
                                  <p>
                                    Sign in to access bonus codes and rewards
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <Gift className="h-4 w-4" />
                        </span>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Updated Leaderboard dropdown with hover functionality */}
              <div className="relative group">
                <Link href="/leaderboard?period=daily">
                  <Button
                    variant="ghost"
                    className="flex items-center gap-1.5 font-heading text-white hover:text-[#D7FF00] transition-colors duration-300 hover:bg-transparent px-2"
                  >
                    <span className="font-bold">LEADERBOARDS</span>
                  </Button>
                </Link>
                <div className="absolute left-0 mt-2 w-full min-w-[200px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-in-out z-50">
                  <div className="bg-[#1A1B21]/95 backdrop-blur-xl border border-[#2A2B31] rounded-xl shadow-2xl py-2 mt-1">
                    <Link href="/leaderboard?period=daily">
                      <div className={dropdownClasses.item}>
                        Daily
                      </div>
                    </Link>
                    <Link href="/leaderboard?period=weekly">
                      <div className={dropdownClasses.item}>
                        Weekly
                      </div>
                    </Link>
                    <Link href="/leaderboard?period=monthly">
                      <div className={dropdownClasses.item}>
                        Monthly
                      </div>
                    </Link>
                    <Link href="/leaderboard?period=all_time">
                      <div className={dropdownClasses.item}>
                        All Time
                      </div>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Socials dropdown */}
              <div className="relative group">
                <Link href="/socials">
                  <Button
                    variant="ghost"
                    className="flex items-center gap-1.5 font-heading text-white hover:text-[#D7FF00] transition-colors duration-300 hover:bg-transparent px-2"
                  >
                    <span className="font-bold">SOCIALS</span>
                  </Button>
                </Link>
                <div className="absolute left-0 mt-2 w-full min-w-[200px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-in-out z-50">
                  <div className="bg-[#1A1B21]/95 backdrop-blur-xl border border-[#2A2B31] rounded-xl shadow-2xl py-2 mt-1">
                    <Link href="/telegram">
                      <div className={dropdownClasses.item}>
                        Telegram Community
                      </div>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Help/FAQ dropdown */}
              <div className="relative group">
                <Link href="/help">
                  <Button
                    variant="ghost"
                    className="flex items-center gap-1.5 font-heading text-white hover:text-[#D7FF00] transition-colors duration-300 hover:bg-transparent px-2"
                  >
                    <span className="font-bold">HELP & FAQ</span>
                  </Button>
                </Link>
                <div className="absolute left-0 mt-2 w-full min-w-[200px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-in-out z-50">
                  <div className="bg-[#1A1B21]/95 backdrop-blur-xl border border-[#2A2B31] rounded-xl shadow-2xl py-2 mt-1">
                    <Link href="/help">
                      <div className={dropdownClasses.item}>
                        Help Center
                      </div>
                    </Link>
                    <Link href="/faq">
                      <div className={dropdownClasses.item}>
                        FAQ
                      </div>
                    </Link>
                    <Link href="/support">
                      <div className={dropdownClasses.item}>
                        Contact Support
                      </div>
                    </Link>
                  </div>
                </div>
              </div>

              {user?.isAdmin && (
                <div className="relative group">
                  <Button
                    variant="ghost"
                    className="flex items-center gap-1.5 font-heading text-white hover:text-[#D7FF00] transition-colors duration-300 hover:bg-transparent px-2"
                  >
                    <span className="font-bold">ADMIN</span>
                  </Button>
                  <div className="absolute left-0 mt-2 w-full min-w-[200px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-in-out z-50">
                    <div className="bg-[#1A1B21]/95 backdrop-blur-xl border border-[#2A2B31] rounded-xl shadow-2xl py-2 mt-1">
                      <Link href="/admin/user-management">
                        <div className={dropdownClasses.item}>
                          User Management
                        </div>
                      </Link>
                      <Link href="/admin/notifications">
                        <div className={dropdownClasses.item}>
                          Notification Management
                        </div>
                      </Link>
                      <Link href="/admin/support">
                        <div className={dropdownClasses.item}>
                          Support Management
                        </div>
                      </Link>
                      <Link href="/admin/wager-races">
                        <div className={dropdownClasses.item}>
                          Wager Race Management
                        </div>
                      </Link>
                      <Link href="/admin/bonus-codes">
                        <div className={dropdownClasses.item}>
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
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-[#D7FF00]/10 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-md" />
                    <Menu className="h-6 w-6 text-white relative z-10 group-hover:text-[#D7FF00] transition-colors duration-300" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-[300px] bg-[#14151A] border-r border-[#2A2B31] overflow-y-auto p-0 shadow-xl"
                >
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col gap-4 pt-8"
                  >
                    <div className="px-4 py-2 text-[#D7FF00] font-heading text-base font-bold">
                      MENU
                    </div>
                    <MobileNavLink
                      href="/"
                      label="HOME"
                      onClose={() => setOpenMobile(false)}
                      isTitle={true}
                    />

                    <div className="mt-6 px-4 py-2 text-[#D7FF00] font-heading text-sm font-bold border-t border-[#2A2B31]/50 pt-6">
                      EVENTS
                    </div>
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
                            <span className="text-xs text-green-500">
                              ONGOING
                            </span>
                          </div>
                        </div>
                      }
                      onClose={() => setOpenMobile(false)}
                    />

                    <div className="mt-6 px-4 py-2 text-[#D7FF00] font-heading text-sm font-bold border-t border-[#2A2B31]/50 pt-6">
                      GET STARTED
                    </div>
                    <MobileNavLink
                      href="/how-it-works"
                      label="How It Works"
                      onClose={() => setOpenMobile(false)}
                    />
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
                      href="/vip-program"
                      label="VIP Program"
                      onClose={() => setOpenMobile(false)}
                    />

                    <div className="mt-6 px-4 py-2 text-[#D7FF00] font-heading text-sm font-bold border-t border-[#2A2B31]/50 pt-6">
                      PROMOTIONS
                    </div>
                    <MobileNavLink
                      href="/promotions"
                      label="News & Promotions"
                      onClose={() => setOpenMobile(false)}
                    />
                    <MobileNavLink
                      href="/goated-token"
                      label="Goated Airdrop"
                      onClose={() => setOpenMobile(false)}
                    />
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

                    <div className="mt-6 px-4 py-2 text-[#D7FF00] font-heading text-sm font-bold border-t border-[#2A2B31]/50 pt-6">
                      LEADERBOARDS
                    </div>
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

                    <div className="mt-6 px-4 py-2 text-[#D7FF00] font-heading text-sm font-bold border-t border-[#2A2B31]/50 pt-6">
                      SOCIALS
                    </div>
                    <MobileNavLink
                      href="/telegram"
                      label="Telegram Community"
                      onClose={() => setOpenMobile(false)}
                    />

                    <div className="mt-6 px-4 py-2 text-[#D7FF00] font-heading text-sm font-bold border-t border-[#2A2B31]/50 pt-6">
                      HELP & SUPPORT
                    </div>
                    <MobileNavLink
                      href="/help"
                      label="Help Center"
                      onClose={() => setOpenMobile(false)}
                    />
                    <MobileNavLink
                      href="/faq"
                      label="FAQ"
                      onClose={() => setOpenMobile(false)}
                    />
                    <MobileNavLink
                      href="/support"
                      label="Contact Support"
                      onClose={() => setOpenMobile(false)}
                    />

                    {user?.isAdmin && (
                      <>
                        <div className="mt-6 px-4 py-2 text-[#D7FF00] font-heading text-sm font-bold border-t border-[#2A2B31]/50 pt-6">
                          ADMIN
                        </div>
                        <MobileNavLink
                          href="/admin/user-management"
                          label="User Management"
                          onClose={() => setOpenMobile(false)}
                        />
                        <MobileNavLink
                          href="/admin/wager-races"
                          label="Wager Race Management"
                          onClose={() => setOpenMobile(false)}
                        />
                        <MobileNavLink
                          href="/admin/bonus-codes"
                          label="Bonus Code Management"
                          onClose={() => setOpenMobile(false)}
                        />
                      </>
                    )}

                    <div className="mt-6 px-4 border-t border-[#2A2B31]/50 pt-6 pb-8">
                      <Button
                        onClick={() => {
                          setOpenMobile(false);
                          window.open(
                            "https://www.goated.com/r/SPIN",
                            "_blank",
                          );
                        }}
                        className="w-full relative overflow-hidden group bg-[#D7FF00] text-[#14151A] hover:text-[#D7FF00] transition-colors duration-300 rounded-md flex items-center justify-center gap-2 py-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="relative z-10">PLAY NOW</span>
                          <div className="relative z-10 play-icon-container">
                            <LineMdPlayFilled className="play-icon" />
                          </div>
                        </div>
                        <div className="absolute inset-0 bg-[#14151A] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                      </Button>
                    </div>
                  </motion.div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* User section */}
          <div className={headerClasses.userSection}>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-[#8A8B91] hover:text-white relative h-8 w-8 md:h-10 md:w-10 transition-all duration-300 rounded-full"
                  >
                    <div className="absolute inset-0 bg-[#2A2B31]/50 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-full"></div>
                    <User className="h-5 w-5 md:h-6 md:w-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className={dropdownClasses.content}
                >
                  <DropdownMenuLabel className="text-white font-heading">
                    My Account
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-[#2A2B31]/50" />
                  <Link href={`/user/${user.id}`}>
                    <DropdownMenuItem className={dropdownClasses.item}>
                      Profile
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/notification-preferences">
                    <DropdownMenuItem className={dropdownClasses.item}>
                      Settings
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator className="bg-[#2A2B31]/50" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="px-4 py-2.5 font-medium text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </div>
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
              className="relative overflow-hidden group bg-[#D7FF00] text-[#14151A] hover:text-[#D7FF00] transition-colors duration-300 rounded-md flex items-center gap-2 h-8 md:h-10 px-3 md:px-4 text-sm md:text-base font-heading"
            >
              <div className="flex items-center gap-2">
                <span className="relative z-10">PLAY</span>
                <div className="relative z-10 play-icon-container">
                  <LineMdPlayFilled className="play-icon" />
                </div>
              </div>
              <div className="absolute inset-0 bg-[#14151A] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
            </Button>
          </div>
        </nav>
      </header>

      <main className="flex-grow pt-16">
        {children}
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
                <h4 className={footerClasses.heading}>Ready to get Goated?</h4>
                <a
                  href="https://www.goated.com/r/VIPBOOST"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transform transition-transform duration-300 hover:scale-110"
                >
                  <img
                    src="/images/Goated Logo - Black.png"
                    alt="Goated"
                    className="h-8 w-auto"
                  />
                </a>
              </div>
              <p className="text-[#14151A] mb-6">
                Sign up now and enjoy additional rewards from our platform.
                Start your journey to becoming a casino legend!
              </p>
              <Button
                onClick={() =>
                  window.open("https://www.goated.com/r/EARLYACCESS", "_blank")
                }
                className="bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 font-medium gap-2 flex items-center"
              >
                <span>Sign Up Now</span>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h4 className={footerClasses.heading}>Stay Updated</h4>
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
                  className="flex-1 px-4 py-2 rounded-lg border border-[#14151A]/20 focus:outline-none focus:border-[#14151A] focus:ring-1 focus:ring-[#14151A]/30 transition-all duration-300 bg-white/95"
                />
                <Button className="bg-[#14151A] text-black hover:bg-[#14151A]/80 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 font-medium">
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
                  className="transform transition-all duration-300 hover:scale-105 hover:brightness-110"
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
                  className="transform transition-all duration-300 hover:scale-105 hover:brightness-110"
                >
                  <img
                    src="/images/Goated logo with text1.png"
                    alt="Goated Partner"
                    className="h-10 md:h-12 w-auto object-contain max-w-[200px]"
                  />
                </a>
              </div>
            </div>
            <p className="mb-2">© 2024 GoatedVips.gg. All rights reserved.</p>
            <p className="mb-2">
              Disclaimer: This is an independent platform not affiliated with or
              operated by Goated.com.
            </p>
            <p>Gamble responsibly. 18+ only. BeGambleAware.org</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavLink({
  href,
  label,
  tooltip,
}: {
  href: string;
  label: string | React.ReactNode;
  tooltip?: string;
}) {
  const [location] = useLocation();
  const isActive = location === href;

  const linkContent = (
    <motion.div
      className={`relative font-heading cursor-pointer ${
        isActive ? "text-[#D7FF00]" : "text-white"
      } hover:text-[#D7FF00] transition-all duration-300`}
      whileHover={{ x: 5 }}
      whileTap={{ scale: 0.95 }}
    >
      {label}
      <motion.div
        className="absolute -bottom-1 left-0 h-0.5 bg-[#D7FF00] origin-left"
        initial={{ scaleX: isActive ? 1 : 0 }}
        animate={{ scaleX: isActive ? 1 : 0 }}
        whileHover={{ scaleX: 1 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );

  return tooltip ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={href}>{linkContent}</Link>
        </TooltipTrigger>
        <TooltipContent className="bg-[#1A1B21] border-[#2A2B31] text-white">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    <Link href={href}>{linkContent}</Link>
  );
}
