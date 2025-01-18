import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/AuthModal";
import { useQuery } from "@tanstack/react-query";
import type { SelectUser } from "@db/schema";
import { ScrollToTop } from "./ScrollToTop"; // Added import
import { useEffect, useRef, useState } from "react"; // Added imports
import { Tooltip, TooltipTrigger, TooltipContent } from '@radix-ui/react-tooltip' // Added tooltip imports - assume these are available


interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const footerRef = useRef<HTMLElement>(null);
  const [isFooterVisible, setIsFooterVisible] = useState(false);

  const { data: user } = useQuery<SelectUser>({
    queryKey: ["/api/user"],
  });

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
      {/* Enhanced Fixed Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-[#14151A]/80 backdrop-blur-xl border-b border-[#2A2B31]/50" />
        <nav className="container mx-auto px-4 relative">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-8">
              {/* Enhanced Logo with glow and wiggle effect */}
              <div className="relative group" id="logo-container">
                <div className="absolute inset-0 rounded-full bg-[#D7FF00]/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Link href="/">
                  <a className="block relative">
                    <div className="absolute inset-0 bg-[#D7FF00]/10 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
                  </a>
                </Link>
              </div>

              {/* Navigation Links */}
              <div className="hidden md:flex items-center gap-6">
                <NavLink href="/" label="HOME" />
                <NavLink href="/wager-races" label="WAGER RACES" />
                <NavLink href="/vip-program" label="VIP PROGRAM" />
                <NavLink href="/promotions" label="PROMOTIONS" />
                <NavLink href="/notification-preferences" label="NOTIFICATIONS" />
                {user?.isAdmin && (
                  <NavLink href="/admin/wager-races" label="ADMIN" />
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <AuthModal />
              {/* Enhanced Play Now Button */}
              <Button
                onClick={() => window.open('https://www.goated.com/r/SPIN', '_blank')}
                className="relative group overflow-hidden font-heading text-white fill-animation hover:text-black transition-all duration-300"
              >
                <span className="relative z-10">PLAY NOW →</span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a href="https://t.me/goatedgroup" target="_blank" rel="noopener noreferrer" className="text-[#8A8B91] hover:text-white transition-colors">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18.835-.963 4.154-1.362 5.511-.168.573-.336.786-.551.835-.467.087-.82-.308-1.27-.605-.706-.474-1.104-.77-1.791-1.235-.791-.528-.279-.818.173-1.29.117-.124 2.144-1.965 2.184-2.132.005-.021.009-.099-.038-.141-.047-.041-.117-.029-.168-.017-.071.018-1.205.766-3.402 2.245-.322.222-.613.33-.874.323-.287-.009-.839-.162-1.249-.295-.505-.169-.908-.258-.873-.544.018-.148.283-.301.795-.46 3.113-1.356 5.188-2.25 6.226-2.686 2.962-1.246 3.577-1.463 3.978-1.47.088-.002.287.02.415.126.106.087.135.202.149.297a1.236 1.236 0 01-.008.339z"/>
                    </svg>
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Join our Telegram group</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-grow pt-16">
        {children}
      </main>
      <ScrollToTop /> {/* Added ScrollToTop component */}
      {/* Footer */}
      <footer ref={footerRef} className={`${isFooterVisible ? 'entrance-zoom' : 'opacity-0'} bg-[#D7FF00] relative`}> {/*Updated Footer class */}
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
            <p className="mb-2">© 2024 Goatedrewards.com. All rights reserved.</p>
            <p className="mb-2">Disclaimer: This website is not operated by Goated.com, and it's not an official site of the Goated.com team.</p>
            <p>Gamble responsibly. 18+ only. BeGambleAware.org</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  const [location] = useLocation();
  const isActive = location === href;

  return (
    <Link href={href}>
      <a className={`relative font-heading cursor-pointer group ${
        isActive ? "text-[#D7FF00]" : "text-white"
      } transition-colors duration-300`}>
        {label}
        <span className={`absolute -bottom-1 left-0 w-0 h-0.5 bg-[#D7FF00] transition-all duration-300 ${
          isActive ? "w-full" : "group-hover:w-full"
        }`} />
      </a>
    </Link>
  );
}