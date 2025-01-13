import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const isActive = (path: string) => location === path;

  return (
    <div className="min-h-screen bg-[#14151A] flex flex-col">
      {/* Fixed Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#2A2B31] bg-[#14151A]/80 backdrop-blur-xl">
        <nav className="container mx-auto px-4">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/">
                <img 
                  src="/logo-neon.png"
                  alt="GOATED"
                  className="h-8 w-auto cursor-pointer"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = "/fallback-logo.png";
                  }}
                />
              </Link>

              <div className="hidden md:flex items-center gap-6">
                <Link href="/">
                  <span className={`font-heading cursor-pointer ${isActive("/") ? "text-[#D7FF00]" : "text-white hover:text-[#D7FF00]"} transition-colors`}>
                    HOME
                  </span>
                </Link>
                <Link href="/wager-races">
                  <span className={`font-heading cursor-pointer ${isActive("/wager-races") ? "text-[#D7FF00]" : "text-white hover:text-[#D7FF00]"} transition-colors`}>
                    WAGER RACES
                  </span>
                </Link>
                <Link href="/vip-program">
                  <span className={`font-heading cursor-pointer ${isActive("/vip-program") ? "text-[#D7FF00]" : "text-white hover:text-[#D7FF00]"} transition-colors`}>
                    VIP PROGRAM
                  </span>
                </Link>
                <Link href="/promotions">
                  <span className={`font-heading cursor-pointer ${isActive("/promotions") ? "text-[#D7FF00]" : "text-white hover:text-[#D7FF00]"} transition-colors`}>
                    PROMOTIONS
                  </span>
                </Link>
                <Link href="/notification-preferences">
                  <span className={`font-heading cursor-pointer ${isActive("/notification-preferences") ? "text-[#D7FF00]" : "text-white hover:text-[#D7FF00]"} transition-colors`}>
                    NOTIFICATIONS
                  </span>
                </Link>
              </div>
            </div>

            <Button 
              onClick={() => window.open('https://www.goated.com/r/KICKBACK', '_blank')}
              className="font-heading bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90 transition-colors"
            >
              PLAY NOW →
            </Button>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-grow pt-16">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-[#D7FF00]">
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h4 className="font-heading text-[#14151A] text-2xl font-bold mb-4">Ready to get Goated?</h4>
              <p className="text-[#14151A] mb-6">
                Sign up now and enjoy additional rewards from our side. Start your journey to becoming a casino legend!
              </p>
              <Button 
                onClick={() => window.open('https://www.goated.com/r/KICKBACK', '_blank')}
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
                  className="flex-1 px-4 py-2 rounded-lg border border-[#14151A]/20 focus:outline-none focus:border-[#14151A]"
                />
                <Button className="bg-[#14151A] text-white hover:bg-[#14151A]/90">
                  Subscribe
                </Button>
              </form>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}