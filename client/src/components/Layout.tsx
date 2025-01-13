import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [email, setEmail] = useState("");
  const [location] = useLocation();

  const isActive = (path: string) => location === path;

  return (
    <div className="min-h-screen bg-[#14151A] flex flex-col">
      {/* Fixed Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#1A1B21]/95 backdrop-blur-sm border-b border-[#2A2B31]">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/">
              <span className="text-[#D7FF00] font-heading text-2xl font-bold cursor-pointer">GOATED</span>
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
            </div>
          </div>
          <Button 
            onClick={() => window.open('https://www.goated.com/r/KICKBACK', '_blank')}
            className="font-heading uppercase tracking-wider text-sm bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90 transition-colors"
          >
            Play now →
          </Button>
        </div>
      </nav>

      {/* Main Content with top padding for fixed header */}
      <main className="flex-grow pt-16">
        {children}
      </main>

      {/* Footer */}
      <div className="bg-[#D7FF00]">
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h4 className="font-heading text-[#14151A] text-2xl font-bold mb-4">Ready to get Goated?</h4>
              <p className="text-[#14151A] mb-6">
                Sign up now and enjoy additional rewards from our side. Start your journey to becoming a casino legend!
              </p>
              <Button 
                onClick={() => window.open('https://www.Goated.com/r/SPIN', '_blank')}
                className="bg-[#14151A] text-white hover:bg-opacity-90 transition-colors font-heading font-bold"
              >
                Sign Up Now
              </Button>
            </div>
            <div>
              <h4 className="font-heading text-[#14151A] text-2xl font-bold mb-4">Stay Updated</h4>
              <p className="text-[#14151A] mb-4">Subscribe to our newsletter for exclusive offers and updates!</p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white text-[#14151A]"
                />
                <Button className="bg-[#14151A] text-white hover:bg-opacity-90">
                  Subscribe
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}