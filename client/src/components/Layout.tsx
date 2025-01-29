import { ReactNode, useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import AuthModal from "@/components/AuthModal";
import { useQuery } from "@tanstack/react-query";
import type { SelectUser } from "@db/schema";
import { ScrollToTop } from "./ScrollToTop";
import { Bell, Settings, User, LogOut, ChevronDown } from "lucide-react";
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

function MobileNavLink({ 
  href, 
  label,
  onClose
}: { 
  href: string; 
  label: string | React.ReactNode;
  onClose: () => void;
}) {
  const [location] = useLocation();
  const isActive = location === href;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClose();
    window.location.href = href; // Use window.location for guaranteed navigation after close
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={`px-4 py-2.5 rounded-lg transition-colors duration-200 cursor-pointer ${
        isActive
          ? "bg-[#D7FF00]/10 text-[#D7FF00]"
          : "text-white hover:bg-[#2A2B31]"
      }`}
    >
      {label}
    </motion.div>
  );
}

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const footerRef = useRef<HTMLElement>(null);
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const [showFloatingSupport, setShowFloatingSupport] = useState(true);
  const { toast } = useToast();
  const [openMobile, setOpenMobile] = useState(false);

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

  const handleCloseMenu = () => {
    setOpenMobile(false);
  };

  return (
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

                {/* GET STARTED dropdown */}
                <div className="relative group">
                  <Link href="/how-it-works">
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 font-heading text-white hover:text-[#D7FF00] transition-colors duration-300 hover:bg-transparent"
                    >
                      <span className="font-bold">GET STARTED</span>
                      <ChevronDown className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
                    </Button>
                  </Link>
                  <div className="absolute left-0 mt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-in-out">
                    <div className="bg-[#1A1B21]/95 backdrop-blur-xl border border-[#2A2B31] rounded-xl shadow-2xl py-2 px-1">
                      <Link href="/how-it-works">
                        <div className="px-4 py-2.5 font-bold hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                          <span className="relative">
                            <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                            <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                              How It Works
                            </span>
                          </span>
                        </div>
                      </Link>
                      <Link href="/vip-transfer">
                        <div className="px-4 py-2.5 font-bold hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                          <span className="relative">
                            <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                            <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                              VIP Transfer
                            </span>
                          </span>
                        </div>
                      </Link>
                      <Link href="/tips-and-strategies">
                        <div className="px-4 py-2.5 font-bold hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                          <span className="relative">
                            <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                            <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                              Tips & Strategies
                            </span>
                          </span>
                        </div>
                      </Link>
                      <Link href="/vip-program">
                        <div className="px-4 py-2.5 font-bold hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
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

                <NavLink
                  href="/wager-races"
                  label={
                    <div className="flex items-center gap-2">
                      <span className="font-bold transition-colors duration-300 group-hover:text-[#D7FF00]">MONTHLY RACE</span>
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
                  <Link href="/leaderboard?period=daily">
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 font-heading text-white hover:text-[#D7FF00] transition-colors duration-300 hover:bg-transparent"
                    >
                      <span className="font-bold">LEADERBOARDS</span>
                      <ChevronDown className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
                    </Button>
                  </Link>
                  <div className="absolute left-0 mt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-in-out">
                    <div className="bg-[#1A1B21]/95 backdrop-blur-xl border border-[#2A2B31] rounded-xl shadow-2xl py-2 px-1">
                      <Link href="/leaderboard?period=daily">
                        <div className="px-4 py-2.5 font-bold hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                          <span className="relative">
                            <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                            <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                              Daily
                            </span>
                          </span>
                        </div>
                      </Link>
                      <Link href="/leaderboard?period=weekly">
                        <div className="px-4 py-2.5 font-bold hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                          <span className="relative">
                            <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                            <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                              Weekly
                            </span>
                          </span>
                        </div>
                      </Link>
                      <Link href="/leaderboard?period=monthly">
                        <div className="px-4 py-2.5 font-bold hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                          <span className="relative">
                            <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                            <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                              Monthly
                            </span>
                          </span>
                        </div>
                      </Link>
                      <Link href="/leaderboard?period=all_time">
                        <div className="px-4 py-2.5 font-bold hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
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

                {/* Promotions dropdown */}
                <div className="relative group">
                  <Link href="/promotions">
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 font-heading text-white hover:text-[#D7FF00] transition-colors duration-300 hover:bg-transparent"
                    >
                      <span className="font-bold">PROMOTIONS</span>
                      <ChevronDown className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
                    </Button>
                  </Link>
                  <div className="absolute left-0 mt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-in-out">
                    <div className="bg-[#1A1B21]/95 backdrop-blur-xl border border-[#2A2B31] rounded-xl shadow-2xl py-2 px-1">
                      <Link href="/promotions">
                        <div className="px-4 py-2.5 font-bold hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                          <span className="relative">
                            <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                            <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                              News & Promotions
                            </span>
                          </span>
                        </div>
                      </Link>
                      <Link href="/bonus-codes">
                        <div className="px-4 py-2.5 font-bold hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                          <span className="relative">
                            <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                            <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                              Bonus Codes
                            </span>
                          </span>
                        </div>
                      </Link>
                      <Link href="/goated-token">
                        <div className="px-4 py-2.5 font-bold hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group-item">
                          <span className="relative">
                            <span className="absolute -left-2 opacity-0 group-hover-item:opacity-100 group-hover-item:left-0 transition-all duration-200">→</span>
                            <span className="relative ml-0 group-hover-item:ml-2 transition-all duration-200">
                              Goated Airdrop
                            </span>
                          </span>
                        </div>
                      </Link>
                    </div>
                  </div>
                </div>
                <NavLink href="/telegram" label="TELEGRAM" tooltip="Join our Telegram community" />
                {user?.isAdmin && (
                  <NavLink href="/admin/wager-races" label="ADMIN" />
                )}
              </div>

              {/* Enhanced mobile navigation */}
              <div className="md:hidden">
                <Sheet open={openMobile} onOpenChange={setOpenMobile}>
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
                    className="w-[300px] bg-[#14151A] border-r border-[#2A2B31] overflow-y-auto p-0"
                  >
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col gap-4 pt-8"
                    >
                      <div className="px-4 py-2 text-[#D7FF00] font-heading text-sm font-bold">MENU</div>
                      <MobileNavLink href="/" label="Home" onClose={handleCloseMenu} />

                      <div className="mt-6 px-4 py-2 text-[#D7FF00] font-heading text-sm font-bold border-t border-[#2A2B31]/50 pt-6">GET STARTED</div>
                      <MobileNavLink href="/how-it-works" label="How It Works" onClose={handleCloseMenu} />
                      <MobileNavLink href="/vip-transfer" label="VIP Transfer" onClose={handleCloseMenu} />
                      <MobileNavLink href="/tips-and-strategies" label="Tips & Strategies" onClose={handleCloseMenu} />
                      <MobileNavLink href="/vip-program" label="VIP Program" onClose={handleCloseMenu} />

                      <div className="mt-6 px-4 py-2 text-[#D7FF00] font-heading text-sm font-bold border-t border-[#2A2B31]/50 pt-6">COMPETITIONS</div>
                      <MobileNavLink 
                        href="/wager-races" 
                        label={
                          <div className="flex items-center gap-2">
                            <span>Monthly Race</span>
                            <div className="flex items-center gap-1">
                              <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                              <span className="text-xs text-red-500">LIVE</span>
                            </div>
                          </div>
                        }
                        onClose={handleCloseMenu}
                      />

                      <div className="mt-6 px-4 py-2 text-[#D7FF00] font-heading text-sm font-bold border-t border-[#2A2B31]/50 pt-6">LEADERBOARDS</div>
                      <MobileNavLink 
                        href="/leaderboard?period=daily" 
                        label="Daily Leaderboard" 
                        onClose={handleCloseMenu}
                      />
                      <MobileNavLink 
                        href="/leaderboard?period=weekly" 
                        label="Weekly Leaderboard" 
                        onClose={handleCloseMenu}
                      />
                      <MobileNavLink 
                        href="/leaderboard?period=monthly" 
                        label="Monthly Leaderboard" 
                        onClose={handleCloseMenu}
                      />
                      <MobileNavLink 
                        href="/leaderboard?period=all-time" 
                        label="All Time Leaderboard" 
                        onClose={handleCloseMenu}
                      />

                      <div className="mt-6 px-4 py-2 text-[#D7FF00] font-heading text-sm font-bold border-t border-[#2A2B31]/50 pt-6">PROMOTIONS</div>
                      <MobileNavLink href="/promotions" label="News & Promotions" onClose={handleCloseMenu} />
                      <MobileNavLink href="/bonus-codes" label="Bonus Codes" onClose={handleCloseMenu} />
                      <MobileNavLink href="/goated-token" label="Goated Airdrop" onClose={handleCloseMenu} />

                      <div className="mt-6 px-4 py-2 text-[#D7FF00] font-heading text-sm font-bold border-t border-[#2A2B31]/50 pt-6">COMMUNITY</div>
                      <MobileNavLink href="/telegram" label="Telegram" onClose={handleCloseMenu} />
                      {user?.isAdmin && (
                        <>
                          <div className="mt-6 px-4 py-2 text-[#D7FF00] font-heading text-sm font-bold border-t border-[#2A2B31]/50 pt-6">ADMIN</div>
                          <MobileNavLink href="/admin/wager-races" label="Admin Panel" onClose={handleCloseMenu} />
                        </>
                      )}

                      <div className="mt-6 px-4 border-t border-[#2A2B31]/50 pt-6">
                        <Button
                          onClick={() => {
                            handleCloseMenu();
                            window.open("https://www.goated.com/r/SPIN", "_blank");
                          }}
                          className="w-full bg-[#D7FF00] text-[#14151A] hover:bg-[#D7FF00]/90 transition-colors font-bold"
                        >
                          PLAY NOW →
                        </Button>
                      </div>
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
                <h4 className="font-heading text-[#14151A] text-2xl font-bold">
                  Stay Updated
                </h4>
                <a 
                  href="https://t.me/goatedvip" 
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
                    href="https://t.me/goatedvip" 
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