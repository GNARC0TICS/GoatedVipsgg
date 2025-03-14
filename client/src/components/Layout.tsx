import { ReactNode, useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Menu, Bell, Settings, User, LogOut, ChevronDown, Gift, Lock, ExternalLink 
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  container: "fixed top-0 left-0 right-0 z-50 bg-[#14151A]/80 backdrop-blur-xl border-b border-[#2A2B31]/50 shadow-sm transition-all duration-300",
  nav: "container mx-auto h-16 px-4 flex items-center justify-between",
  logo: "h-8 w-auto relative z-10 transition-all duration-300 hover:scale-105 hover:brightness-110",
  menuButton: "md:hidden relative overflow-hidden group",
  desktopNav: "hidden md:flex items-center space-x-6",
  userSection: "flex items-center space-x-4",
};

// Consolidated dropdown styling
const dropdownClasses = {
  content: "w-56 bg-[#1A1B21]/95 backdrop-blur-xl border border-[#2A2B31] rounded-xl shadow-2xl py-2 px-1",
  item: "px-4 py-2.5 font-medium text-white hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer group",
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

function MobileNavLink({ href, label, onClose, isTitle = false }: { href: string; label: string | React.ReactNode; onClose: () => void; isTitle?: boolean; }) {
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
        isActive ? "bg-[#D7FF00]/10 text-[#D7FF00]" : "text-white hover:bg-[#2A2B31]"
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
    window.addEventListener('resize', handleResize);

    // Clean up
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsFooterVisible(entry.isIntersecting),
      { threshold: 0.1 }
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
      <header className={`${headerClasses.container} ${scrolled ? 'h-16 shadow-md' : 'h-16'}`}>
        <nav className={headerClasses.nav}>
          {/* Navigation content */}
          <div className="flex items-center gap-8">
            <Link href="/" className="group relative">
              <img src="/images/logo-neon.png" alt="GOATED" className={headerClasses.logo} />
              <div className="absolute inset-0 bg-[#D7FF00]/0 rounded-full filter blur-md transition-all duration-300 group-hover:bg-[#D7FF00]/30 group-hover:blur-xl -z-10"></div>
            </Link>

            {/* Desktop Navigation */}
            <div className={headerClasses.desktopNav}>
              {/* GET STARTED dropdown - now first */}
              <div className="relative group">
                <Link href="/how-it-works">
                  <Button
                    variant="ghost"
                    className="flex items-center gap-1.5 font-heading text-white hover:text-[#D7FF00] transition-colors duration-300 hover:bg-transparent px-2"
                  >
                    <span className="font-bold">GET STARTED</span>
                    <ChevronDown className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
                  </Button>
                </Link>
                <div className="absolute left-0 mt-2 w-full min-w-[200px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-in-out z-50">
                  <div className="bg-[#1A1B21]/95 backdrop-blur-xl border border-[#2A2B31] rounded-xl shadow-2xl py-2 px-1">
                    <Link href="/how-it-works">
                      <div className={dropdownClasses.item}>
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover:opacity-100 group-hover:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover:ml-2 transition-all duration-200">
                            How It Works
                          </span>
                        </span>
                      </div>
                    </Link>
                    <Link href="/vip-transfer">
                      <div className={dropdownClasses.item}>
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover:opacity-100 group-hover:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover:ml-2 transition-all duration-200">
                            VIP Transfer
                          </span>
                        </span>
                      </div>
                    </Link>
                    <Link href="/tips-and-strategies">
                      <div className={dropdownClasses.item}>
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover:opacity-100 group-hover:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover:ml-2 transition-all duration-200">
                            Tips & Strategies
                          </span>
                        </span>
                      </div>
                    </Link>
                    <Link href="/vip-program">
                      <div className={dropdownClasses.item}>
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover:opacity-100 group-hover:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover:ml-2 transition-all duration-200">
                            VIP Program
                          </span>
                        </span>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>

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

              {/* Promotions dropdown */}
              <div className="relative group">
                <Link href="/promotions">
                  <Button
                    variant="ghost"
                    className="flex items-center gap-1.5 font-heading text-white hover:text-[#D7FF00] transition-colors duration-300 hover:bg-transparent px-2"
                  >
                    <span className="font-bold">PROMOTIONS</span>
                    <ChevronDown className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
                  </Button>
                </Link>
                <div className="absolute left-0 mt-2 w-full min-w-[200px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-in-out z-50">
                  <div className="bg-[#1A1B21]/95 backdrop-blur-xl border border-[#2A2B31] rounded-xl shadow-2xl py-2 px-1">
                    <Link href="/promotions">
                      <div className={dropdownClasses.item}>
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover:opacity-100 group-hover:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover:ml-2 transition-all duration-200">
                            News & Promotions
                          </span>
                        </span>
                      </div>
                    </Link>
                    <Link href="/goated-token">
                      <div className={dropdownClasses.item}>
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover:opacity-100 group-hover:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover:ml-2 transition-all duration-200">
                            Goated Airdrop
                          </span>
                        </span>
                      </div>
                    </Link>
                    <Link href="/bonus-codes">
                      <div className={dropdownClasses.item}>
                        <span className="relative flex items-center gap-2">
                          <span className="absolute -left-2 opacity-0 group-hover:opacity-100 group-hover:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover:ml-2 transition-all duration-200">
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
                <Link href="/leaderboard?period=daily">
                  <Button
                    variant="ghost"
                    className="flex items-center gap-1.5 font-heading text-white hover:text-[#D7FF00] transition-colors duration-300 hover:bg-transparent px-2"
                  >
                    <span className="font-bold">LEADERBOARDS</span>
                    <ChevronDown className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
                  </Button>
                </Link>
                <div className="absolute left-0 mt-2 w-full min-w-[200px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-in-out z-50">
                  <div className="bg-[#1A1B21]/95 backdrop-blur-xl border border-[#2A2B31] rounded-xl shadow-2xl py-2 px-1">
                    <Link href="/leaderboard?period=daily">
                      <div className={dropdownClasses.item}>
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover:opacity-100 group-hover:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover:ml-2 transition-all duration-200">
                            Daily
                          </span>
                        </span>
                      </div>
                    </Link>
                    <Link href="/leaderboard?period=weekly">
                      <div className={dropdownClasses.item}>
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover:opacity-100 group-hover:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover:ml-2 transition-all duration-200">
                            Weekly
                          </span>
                        </span>
                      </div>
                    </Link>
                    <Link href="/leaderboard?period=monthly">
                      <div className={dropdownClasses.item}>
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover:opacity-100 group-hover:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover:ml-2 transition-all duration-200">
                            Monthly
                          </span>
                        </span>
                      </div>
                    </Link>
                    <Link href="/leaderboard?period=all_time">
                      <div className={dropdownClasses.item}>
                        <span className="relative">
                          <span className="absolute -left-2 opacity-0 group-hover:opacity-100 group-hover:left-0 transition-all duration-200">→</span>
                          <span className="relative ml-0 group-hover:ml-2 transition-all duration-200">
                            All Time
                          </span>
                        </span>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>


              {/* User Section */}
              <div className={headerClasses.userSection}>
                {isAuthenticated ? (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-2">
                          <User className="h-5 w-5" />
                          <span>{user.name}</span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className={dropdownClasses.content}>
                        <DropdownMenuLabel>Account</DropdownMenuLabel>
                        <DropdownMenuItem onClick={handleLogout}>
                          Log out
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <Button onClick={() => setOpenMobile(true)} variant="primary">
                    Sign in
                  </Button>
                )}
              </div>
            </div>
          </div>
          {/* Mobile Menu Button */}
          <div className={headerClasses.menuButton}>
            <button
              className="p-2 rounded-full bg-[#2A2B31]/50 hover:bg-[#2A2B31]/80 transition-all duration-200"
              onClick={() => setOpenMobile(!openMobile)}
            >
              <Menu className="h-6 w-6 text-[#D7FF00]" />
            </button>
          </div>

          {/* Mobile Menu */}
          {openMobile && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="absolute top-16 right-0 md:hidden bg-[#1A1B21]/95 backdrop-blur-xl border border-[#2A2B31] rounded-xl shadow-2xl p-4 w-full"
            >
              <MobileNavLink href="/" label="Home" onClose={() => setOpenMobile(false)} isTitle />
              <MobileNavLink href="/how-it-works" label="How it Works" onClose={() => setOpenMobile(false)} />
              <MobileNavLink href="/vip-transfer" label="VIP Transfer" onClose={() => setOpenMobile(false)} />
              <MobileNavLink href="/tips-and-strategies" label="Tips & Strategies" onClose={() => setOpenMobile(false)} />
              <MobileNavLink href="/vip-program" label="VIP Program" onClose={() => setOpenMobile(false)} />
              <MobileNavLink href="/promotions" label="Promotions" onClose={() => setOpenMobile(false)} />
              <MobileNavLink href="/leaderboard?period=daily" label="Leaderboards" onClose={() => setOpenMobile(false)} />
              {isAuthenticated && (
                <>
                  <MobileNavLink href="/profile" label="Profile" onClose={() => setOpenMobile(false)} />
                  <MobileNavLink href="/bonus-codes" label="Bonus Codes" onClose={() => setOpenMobile(false)} />
                  <MobileNavLink href="/settings" label="Settings" onClose={() => setOpenMobile(false)} />
                  <MobileNavLink href="/logout" label="Logout" onClose={() => setOpenMobile(false)} />
                </>
              )}
              {!isAuthenticated && (
                <MobileNavLink href="/login" label="Sign In" onClose={() => setOpenMobile(false)} />
              )}
            </motion.div>
          )}
        </nav>
      </header>
      <main className="flex-grow">{children}</main>
      <footer ref={footerRef} className={footerClasses.wrapper}>
        <div className={footerClasses.container}>
          <div className={footerClasses.grid}>
            <div>
              <h2 className={footerClasses.heading}>GOATED</h2>
              <p className="mt-4 text-lg text-[#14151A]/70">
                GOATED is a revolutionary platform that revolutionizes how we wager and race.
              </p>
            </div>
            <div className="flex flex-col space-y-4">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-[#14151A]" />
                <a href="https://goated.gg" target="_blank" rel="noreferrer" className="text-[#14151A]">
                  Visit Website
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
      {showFloatingSupport && <FloatingSupport />}
      <AuthModal open={openMobile} onClose={() => setOpenMobile(false)} />
      <ScrollToTop />
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string | React.ReactNode }) {
  const [location] = useLocation();
  const isActive = location === href;

  return (
    <Link href={href}>
      <motion.div
        variants={hoverVariants}
        initial="initial"
        whileHover="hover"
        className={`transition-all duration-300 font-heading text-white hover:text-[#D7FF00] ${isActive ? "font-bold" : ""}`}
      >
        {label}
      </motion.div>
    </Link>
  );
}