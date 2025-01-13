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
      <nav className="fixed top-0 w-full z-50 bg-[#1A1B21] border-b border-[#2A2B31]">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/">
              <a className="text-[#D7FF00] font-heading text-2xl font-bold">GOATED</a>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/">
                <a className={`font-heading ${isActive("/") ? "text-[#D7FF00]" : "text-white hover:text-[#D7FF00]"} transition-colors`}>
                  HOME
                </a>
              </Link>
              <Link href="/wager-races">
                <a className={`font-heading ${isActive("/wager-races") ? "text-[#D7FF00]" : "text-white hover:text-[#D7FF00]"} transition-colors`}>
                  WAGER RACES
                </a>
              </Link>
              <Link href="/vip-program">
                <a className={`font-heading ${isActive("/vip-program") ? "text-[#D7FF00]" : "text-white hover:text-[#D7FF00]"} transition-colors`}>
                  VIP PROGRAM
                </a>
              </Link>
              <Link href="/promotions">
                <a className={`font-heading ${isActive("/promotions") ? "text-[#D7FF00]" : "text-white hover:text-[#D7FF00]"} transition-colors`}>
                  PROMOTIONS
                </a>
              </Link>
            </div>
          </div>
          <Link href="https://www.goated.com/r/KICKBACK">
            <a 
              target="_blank"
              rel="noopener noreferrer"
              className="font-heading uppercase tracking-wider text-sm bg-[#D7FF00] text-black px-4 py-2 rounded-lg hover:bg-[#D7FF00]/90 transition-colors"
            >
              Play now →
            </a>
          </Link>
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
              <a 
                href="https://www.Goated.com/r/SPIN" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block bg-[#14151A] text-white px-6 py-3 rounded-lg font-heading font-bold hover:bg-opacity-90 transition-colors"
              >
                Sign Up Now
              </a>
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