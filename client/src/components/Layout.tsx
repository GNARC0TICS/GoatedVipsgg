import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import AuthModal from "@/components/AuthModal";
import { useQuery } from "@tanstack/react-query";
import type { SelectUser } from "@db/schema";
import { ScrollToTop } from "./ScrollToTop";
import { useEffect, useRef, useState } from "react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Bell, Settings, User, LogOut, ChevronDown } from "lucide-react";
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
import { TutorialProvider } from "./TutorialContext"; // Assuming TutorialProvider is imported correctly


interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const footerRef = useRef<HTMLElement>(null);
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const [showFloatingSupport, setShowFloatingSupport] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  const { data: user } = useQuery<SelectUser>({
    queryKey: ["/api/user"],
  });

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsFooterVisible(true);
        }
      },
      { threshold: 0.1 },
    );

    if (footerRef.current) {
      observer.observe(footerRef.current);
    }

    return () => {
      if (footerRef.current) {
        observer.unobserve(footerRef.current);
      }
    };
  }, []);

  return (
    <TutorialProvider> {/* Added TutorialProvider */}
      <div className="min-h-screen bg-[#14151A] flex flex-col">
        <header className="fixed top-0 left-0 right-0 z-50">
          <div className="absolute inset-0 bg-[#14151A]/80 backdrop-blur-xl border-b border-[#2A2B31]/50" />
          <nav className="container mx-auto px-4 relative">
            <div className="h-16 flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div className="relative group" id="logo-container">
                  <div className="absolute inset-0 rounded-full bg-[#D7FF00]/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <Link href="/">
                    <img
                      src="/images/logo-neon.png"
                      alt="GOATED"
                      className="h-6 md:h-8 w-auto relative z-10 transition-transform duration-300 hover:scale-105 wiggle"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = "https://placehold.co/120x32/14151A/D7FF00?text=GOATED";
                      }}
                    />
                  </Link>
                </div>

                <div className="hidden md:flex items-center gap-8">
                  <NavLink href="/" label="HOME" />

                  {/* Updated GET STARTED dropdown with hover */}
                  <div className="relative group get-started-dropdown">
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 font-heading text-white group-hover:text-[#D7FF00] transition-all duration-300"
                    >
                      <span className="font-bold">GET STARTED</span>
                      <ChevronDown className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
                    </Button>
                    <div className="absolute left-0 mt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-in-out">
                      <div className="bg-[#1A1B21] border border-[#2A2B31] rounded-lg shadow-lg py-1">
                        <Link href="/how-it-works">
                          <div className="px-4 py-2 font-bold hover:bg-[#D7FF00]/10 hover:text-[#D7FF00] transition-all duration-200 cursor-pointer">
                            How It Works
                          </div>
                        </Link>
                        <Link href="/tips-and-strategies">
                          <div className="px-4 py-2 font-bold hover:bg-[#D7FF00]/10 hover:text-[#D7FF00] transition-all duration-200 cursor-pointer">
                            Tips & Strategies
                          </div>
                        </Link>
                        <Link href="/vip-program">
                          <div className="px-4 py-2 font-bold hover:bg-[#D7FF00]/10 hover:text-[#D7FF00] transition-all duration-200 cursor-pointer">
                            VIP Program
                          </div>
                        </Link>
                      </div>
                    </div>
                  </div>

                  <NavLink
                    href="/wager-races"
                    label={
                      <div className="flex items-center gap-2">
                        <span className="font-bold transition-colors duration-300 group-hover:text-[#D7FF00]">WAGER RACES</span>
                        <div className="flex items-center gap-1">
                          <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                          <span className="text-xs text-red-500 font-heading">
                            LIVE
                          </span>
                        </div>
                      </div>
                    }
                  />

                  {/* Updated Leaderboard dropdown with hover functionality */}
                  <div className="relative group">
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 font-heading text-white group-hover:text-[#D7FF00] transition-all duration-300"
                    >
                      <span className="font-bold">LEADERBOARDS</span>
                      <ChevronDown className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
                    </Button>
                    <div className="absolute left-0 mt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-in-out">
                      <div className="bg-[#1A1B21] border border-[#2A2B31] rounded-lg shadow-lg py-1">
                        <Link href="/leaderboard?period=daily">
                          <div className="px-4 py-2 font-bold hover:bg-[#D7FF00]/10 hover:text-[#D7FF00] transition-all duration-200 cursor-pointer">
                            Daily
                          </div>
                        </Link>
                        <Link href="/leaderboard?period=weekly">
                          <div className="px-4 py-2 font-bold hover:bg-[#D7FF00]/10 hover:text-[#D7FF00] transition-all duration-200 cursor-pointer">
                            Weekly
                          </div>
                        </Link>
                        <Link href="/leaderboard?period=monthly">
                          <div className="px-4 py-2 font-bold hover:bg-[#D7FF00]/10 hover:text-[#D7FF00] transition-all duration-200 cursor-pointer">
                            Monthly
                          </div>
                        </Link>
                        <Link href="/leaderboard?period=all_time">
                          <div className="px-4 py-2 font-bold hover:bg-[#D7FF00]/10 hover:text-[#D7FF00] transition-all duration-200 cursor-pointer">
                            All Time
                          </div>
                        </Link>
                      </div>
                    </div>
                  </div>

                  <NavLink href="/promotions" label="PROMOTIONS" />
                  <NavLink href="/telegram" label="TELEGRAM" tooltip="Join our Telegram community" />
                  {user?.isAdmin && (
                    <NavLink href="/admin/wager-races" label="ADMIN" />
                  )}
                </div>

                {/* Enhanced mobile navigation */}
                <div className="md:hidden">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="relative overflow-hidden group"
                      >
                        <div className="absolute inset-0 bg-[#D7FF00]/10 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                        <Menu className="h-6 w-6 text-white relative z-10 group-hover:text-[#D7FF00] transition-colors duration-300" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent
                      side="left"
                      className="w-[300px] bg-[#14151A] border-r border-[#2A2B31]"
                    >
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col gap-4 pt-8"
                      >
                        <div className="px-4 py-2 text-[#D7FF00] font-heading text-sm">GET STARTED</div>
                        <MobileNavLink href="/" label="HOME" />
                        <MobileNavLink href="/how-it-works" label="HOW IT WORKS" />
                        <MobileNavLink href="/tips-and-strategies" label="TIPS & STRATEGIES" />
                        <MobileNavLink href="/vip-program" label="VIP PROGRAM" />

                        <div className="px-4 py-2 mt-4 text-[#D7FF00] font-heading text-sm">COMPETE</div>
                        <MobileNavLink href="/wager-races" label={
                          <div className="flex items-center gap-2">
                            WAGER RACES
                            <div className="flex items-center gap-1">
                              <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                              <span className="text-xs text-red-500">LIVE</span>
                            </div>
                          </div>
                        } />
                        <MobileNavLink href="/leaderboard?period=daily" label="DAILY LEADERBOARD" />
                        <MobileNavLink href="/leaderboard?period=weekly" label="WEEKLY LEADERBOARD" />
                        <MobileNavLink href="/leaderboard?period=monthly" label="MONTHLY LEADERBOARD" />
                        <MobileNavLink href="/leaderboard?period=all-time" label="ALL TIME LEADERBOARD" />

                        <div className="px-4 py-2 mt-4 text-[#D7FF00] font-heading text-sm">MORE</div>
                        <MobileNavLink href="/promotions" label="PROMOTIONS" />
                        <MobileNavLink href="/telegram" label="TELEGRAM" />
                        {user?.isAdmin && (
                          <MobileNavLink href="/admin/wager-races" label="ADMIN" />
                        )}
                      </motion.div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-6">
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
                      {/* Example notifications */}
                      <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                        <div className="text-sm font-medium">
                          New Wager Race Started
                        </div>
                        <div className="text-xs text-[#8A8B91]">
                          Monthly race has begun with $5000 prize pool
                        </div>
                        <div className="text-xs text-[#8A8B91]">
                          2 minutes ago
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                        <div className="text-sm font-medium">
                          VIP Status Update
                        </div>
                        <div className="text-xs text-[#8A8B91]">
                          You're close to reaching Silver tier!
                        </div>
                        <div className="text-xs text-[#8A8B91]">1 hour ago</div>
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

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
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <Link href={`/user/${user.id}`}>
                          <DropdownMenuItem className="cursor-pointer">
                            Profile
                          </DropdownMenuItem>
                        </Link>
                        <Link href="/notification-preferences">
                          <DropdownMenuItem className="cursor-pointer">
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
                    className="relative group overflow-hidden text-[#14151A] fill-animation hover:text-[#D7FF00] transition-all duration-300 font-mona-sans font-extrabold uppercase tracking-tight h-8 md:h-10 px-3 md:px-4 text-sm md:text-base"
                    style={{
                      fontStretch: "condensed",
                      fontVariationSettings: "'COND' 100, 'wght' 800",
                    }}
                  >
                    <span className="relative z-10">PLAY →</span>
                  </Button>
                </div>
              </div>
            </div>
          </nav>
        </header>

        <main className="flex-grow pt-16">{children}</main>

        {showFloatingSupport && (
          <FloatingSupport onClose={() => setShowFloatingSupport(false)} />
        )}

        <ScrollToTop />

        <footer
          ref={footerRef}
          className={`${isFooterVisible ? "entrance-zoom" : "opacity-0"} bg-[#D7FF00] relative`}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#D7FF00]/20 to-transparent pointer-events-none" />
          <div className="container mx-auto px-4 py-16 relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h4 className="font-heading text-[#14151A] text-2xl font-bold">
                    Ready to get Goated?
                  </h4>
                  <img
                    src="/images/Goated Logo - Black.png"
                    alt="Goated"
                    className="h-8 w-auto entrance-zoom wiggle-animation"
                  />
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
                <h4 className="font-heading text-[#14151A] text-2xl font-bold mb-4">
                  Stay Updated
                </h4>
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
                  <img
                    src="/images/Goated logo with text.png"
                    alt="Goated"
                    className="h-10 md:h-12 w-auto object-contain max-w-[200px]"
                  />
                  <img
                    src="/images/Goated logo with text1.png"
                    alt="Goated Partner"
                    className="h-10 md:h-12 w-auto object-contain max-w-[200px]"
                  />
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
    </TutorialProvider> {/* Closing TutorialProvider */}
  );
}

// Updated NavLink component with enhanced hover effects and underline animation
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
      className={`relative font-heading cursor-pointer group ${
        isActive ? "text-[#D7FF00]" : "text-white"
      } transition-all duration-300 ease-in-out hover:text-[#D7FF00]`}
      whileHover={{ scale: 1.05 }}
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

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href={href}>{linkContent}</Link>
      </TooltipTrigger>
      {tooltip && (
        <TooltipContent sideOffset={5} className="bg-[#1A1B21] border-[#2A2B31]">
          <p>{tooltip}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}


function MobileNavLink({ href, label }: { href: string; label: string | React.ReactNode }) {
  const [location] = useLocation();
  const isActive = location === href;

  return (
    <Link href={href}>
      <motion.div
        data-tutorial={href.replace('/', '')}
        whileHover={{ x: 8, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`px-4 py-2 rounded-lg transition-all duration-200 ${
          isActive
            ? "bg-[#D7FF00]/10 text-[#D7FF00]"
            : "text-white hover:bg-[#2A2B31] hover:text-[#D7FF00]"
        }`}
      >
        {label}
      </motion.div>
    </Link>
  );
}