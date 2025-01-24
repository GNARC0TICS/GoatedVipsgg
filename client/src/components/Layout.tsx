import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import AuthModal from "@/components/AuthModal";
import { useQuery } from "@tanstack/react-query";
import type { SelectUser } from "@db/schema";
import { ScrollToTop } from "./ScrollToTop";
import { useEffect, useRef, useState } from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Bell, Settings, User, LogOut, ChevronDown } from 'lucide-react';
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
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }

      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive"
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
      { threshold: 0.1 }
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
                    className="h-8 w-auto relative z-10 transition-transform duration-300 hover:scale-105 wiggle"
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
                <NavLink 
                  href="/wager-races" 
                  label={
                    <div className="flex items-center gap-2 font-heading">
                      WAGER RACES
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-xs text-red-500 font-heading">LIVE</span>
                      </div>
                    </div>
                  } 
                />
                <NavLink href="/vip-program" label="VIP PROGRAM" />
                <NavLink href="/promotions" label="PROMOTIONS" />
                <NavLink href="/telegram" 
                  label={
                    <div className="flex items-center gap-2 font-heading">
                      TELEGRAM
                    </div>
                  } 
                  tooltip="Join our Telegram community"
                />
                {user?.isAdmin && (
                  <NavLink href="/admin/wager-races" label="ADMIN" />
                )}
              </div>
            </div>

            <div className="flex items-center gap-6">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-[#8A8B91] hover:text-white relative"
                  >
                    <Bell className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80 bg-[#1A1B21] border-[#2A2B31]">
                  <DropdownMenuLabel className="flex items-center justify-between">
                    Notifications
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open('/notification-preferences', '_self')}
                      className="h-8 w-8"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="max-h-[300px] overflow-y-auto">
                    {/* Example notifications */}
                    <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                      <div className="text-sm font-medium">New Wager Race Started</div>
                      <div className="text-xs text-[#8A8B91]">Monthly race has begun with $5000 prize pool</div>
                      <div className="text-xs text-[#8A8B91]">2 minutes ago</div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                      <div className="text-sm font-medium">VIP Status Update</div>
                      <div className="text-xs text-[#8A8B91]">You're close to reaching Silver tier!</div>
                      <div className="text-xs text-[#8A8B91]">1 hour ago</div>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex items-center gap-4">
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center gap-2 text-white">
                        <User className="h-5 w-5" />
                        <span className="hidden md:inline">{user.username}</span>
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
                      <DropdownMenuItem onClick={handleLogout} className="text-red-500 cursor-pointer">
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <AuthModal />
                )}
                <Button
                  onClick={() => window.open('https://www.goated.com/r/SPIN', '_blank')}
                  className="relative group overflow-hidden text-[#14151A] fill-animation hover:text-[#D7FF00] transition-all duration-300 font-mona-sans font-extrabold uppercase tracking-tight"
                  style={{ fontStretch: "condensed" }}
                >
                  <span className="relative z-10">PLAY NOW →</span>
                </Button>
              </div>
            </div>
          </div>
        </nav>
      </header>

      <main className="flex-grow pt-16">
        {children}
      </main>

      {showFloatingSupport && <FloatingSupport onClose={() => setShowFloatingSupport(false)} />}

      <ScrollToTop />

      <footer ref={footerRef} className={`${isFooterVisible ? 'entrance-zoom' : 'opacity-0'} bg-[#D7FF00] relative`}>
        <div className="absolute inset-0 bg-gradient-to-b from-[#D7FF00]/20 to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 py-16 relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h4 className="font-heading text-[#14151A] text-2xl font-bold">Ready to get Goated?</h4>
                <img
                  src="/images/Goated Logo - Black.png"
                  alt="Goated"
                  className="h-8 w-auto entrance-zoom wiggle-animation"
                />
              </div>
              <p className="text-[#14151A] mb-6">
                Sign up now and enjoy additional rewards from our side. Start your journey to becoming a casino legend!
              </p>
              <Button
                onClick={() => window.open('https://www.goated.com/r/EARLYACCESS', '_blank')}
                className="bg-[#14151A] text-white hover:bg-[#14151A]/90 transition-colors"
              >
                Sign Up Now
              </Button>
            </div>
            <div>
              <h4 className="font-heading text-[#14151A] text-2xl font-bold mb-4">Stay Updated</h4>
              <p className="text-[#14151A] mb-6">Subscribe to our newsletter for exclusive offers and updates!</p>
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
              <div className="flex items-center justify-center gap-8">
                <img
                  src="/images/Goated logo with text.png"
                  alt="Goated"
                  className="h-12 w-auto"
                />
                <img
                  src="/images/Goated logo with text1.png"
                  alt="Goated Partner"
                  className="h-12 w-auto"
                />
              </div>
            </div>
            <p className="mb-2">© 2024 Goatedrewards.com. All rights reserved.</p>
            <p className="mb-2">Disclaimer: This website is not operated by Goated.com, and it's not an official site of the Goated.com team.</p>
            <p>Gamble responsibly. 18+ only. BeGambleAware.org</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ href, label, tooltip }: { href: string; label: string | React.ReactNode; tooltip?: string }) {
  const [location] = useLocation();
  const isActive = location === href;

  const linkContent = (
    <span className={`relative font-heading cursor-pointer group ${
      isActive ? "text-[#D7FF00]" : "text-white"
    } transition-colors duration-300`}>
      {label}
      <span className={`absolute -bottom-1 left-0 w-0 h-0.5 bg-[#D7FF00] transition-all duration-300 ${
        isActive ? "w-full" : "group-hover:w-full"
      }`} />
    </span>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href={href}>
          {linkContent}
        </Link>
      </TooltipTrigger>
      {tooltip && (
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}