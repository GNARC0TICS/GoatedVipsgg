import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/AuthModal";
import { useQuery } from "@tanstack/react-query";
import type { SelectUser } from "@db/schema";
import { Settings, Users, ChartBar } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const { data: user } = useQuery<SelectUser>({
    queryKey: ["/api/user"],
  });

  const isAdmin = user?.isAdmin;

  return (
    <div className="min-h-screen bg-[#14151A] flex flex-col">
      {/* Enhanced Fixed Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-[#14151A]/80 backdrop-blur-xl border-b border-[#2A2B31]/50" />
        <nav className="container mx-auto px-4 relative">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-8">
              {/* Logo with glow effect */}
              <div className="relative group">
                <div className="absolute inset-0 rounded-full bg-[#D7FF00]/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Link href="/">
                  <a className="block relative">
                    <div className="absolute inset-0 bg-[#D7FF00]/10 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <img 
                      src="/logo-neon.png"
                      alt="GOATED"
                      className="h-8 w-auto relative z-10 transition-transform duration-300 hover:scale-105"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = "https://placehold.co/120x32/14151A/D7FF00?text=GOATED";
                      }}
                    />
                  </a>
                </Link>
              </div>

              {/* Navigation Links */}
              <div className="hidden md:flex items-center gap-6">
                <NavLink href="/" label="HOME" />
                <NavLink href="/wager-races" label="WAGER RACES" />
                <NavLink href="/vip-program" label="VIP PROGRAM" />
                <NavLink href="/promotions" label="PROMOTIONS" />
                {/* Enhanced Admin Section with Clear Visual Separation */}
                {isAdmin && (
                  <div className="flex items-center gap-4 ml-4 pl-4 border-l border-[#2A2B31]">
                    <NavLink 
                      href="/admin/wager-races" 
                      label="RACE ADMIN"
                      icon={<ChartBar className="w-4 h-4" />}
                    />
                    <NavLink 
                      href="/admin/users" 
                      label="USERS"
                      icon={<Users className="w-4 h-4" />}
                    />
                    <NavLink 
                      href="/admin/settings" 
                      label="SETTINGS"
                      icon={<Settings className="w-4 h-4" />}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <AuthModal />
              {/* Enhanced Play Now Button */}
              <Button 
                onClick={() => window.open('https://www.goated.com/r/SPIN', '_blank')}
                className="relative group overflow-hidden font-heading bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90 transition-all duration-300"
              >
                <span className="relative z-10">PLAY NOW →</span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </Button>
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-grow pt-16 font-mono body-text">
        {children}
      </main>

      {/* Enhanced Footer with Proper Typography */}
      <footer className="bg-[#1A1B21] relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#D7FF00]/5 to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 py-16 relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <h4 className="header-text text-[#D7FF00] text-2xl mb-4">Ready to get Goated?</h4>
              <p className="body-text text-white/80 mb-6">
                Join the ultimate gaming experience. Start your journey to becoming a casino legend with exclusive rewards and bonuses.
              </p>
              <Button 
                onClick={() => window.open('https://www.goated.com/r/EARLYACCESS', '_blank')}
                className="bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90 font-heading"
              >
                Sign Up Now
              </Button>
            </div>
            <div>
              <h4 className="header-text text-[#D7FF00] text-xl mb-4">Quick Links</h4>
              <div className="grid gap-2">
                <Link href="/wager-races">
                  <a className="body-text text-white/60 hover:text-white transition-colors">Wager Races</a>
                </Link>
                <Link href="/vip-program">
                  <a className="body-text text-white/60 hover:text-white transition-colors">VIP Program</a>
                </Link>
                <Link href="/promotions">
                  <a className="body-text text-white/60 hover:text-white transition-colors">Promotions</a>
                </Link>
              </div>
            </div>
            <div>
              <h4 className="header-text text-[#D7FF00] text-xl mb-4">Newsletter</h4>
              <p className="body-text text-white/80 mb-4">
                Subscribe for exclusive offers and updates
              </p>
              <form onSubmit={(e) => e.preventDefault()} className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-2 rounded-lg bg-[#14151A] border border-[#2A2B31] text-white placeholder:text-white/40 focus:outline-none focus:border-[#D7FF00] transition-colors duration-300 body-text"
                />
                <Button className="bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90 font-heading">
                  Subscribe
                </Button>
              </form>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-[#2A2B31]">
            <p className="body-text text-center text-white/40">
              © {new Date().getFullYear()} GOATED. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ href, label, icon }: { href: string; label: string; icon?: ReactNode }) {
  const [location] = useLocation();
  const isActive = location === href;

  return (
    <Link href={href}>
      <a className={`relative header-text cursor-pointer group flex items-center gap-2 ${
        isActive ? "text-[#D7FF00]" : "text-white"
      } transition-colors duration-300`}>
        {icon}
        {label}
        <span className={`absolute -bottom-1 left-0 w-0 h-0.5 bg-[#D7FF00] transition-all duration-300 ${
          isActive ? "w-full" : "group-hover:w-full"
        }`} />
      </a>
    </Link>
  );
}