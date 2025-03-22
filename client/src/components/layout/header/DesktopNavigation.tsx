import { NavLink } from './NavLink';
import { NavDropdown } from './NavDropdown';
import { Gift, Lock } from 'lucide-react';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { SelectUser } from '@db/schema';

interface DesktopNavigationProps {
  user: SelectUser | undefined;
}

export function DesktopNavigation({ user }: DesktopNavigationProps) {
  const isAuthenticated = !!user;

  return (
    <div className="hidden md:flex items-center space-x-6">
      <NavLink href="/" label="HOME" />
      
      {/* GET STARTED dropdown */}
      <NavDropdown 
        label="GET STARTED"
        defaultHref="/how-it-works"
        items={[
          { href: "/how-it-works", label: "How It Works" },
          { href: "/vip-transfer", label: "VIP Transfer" },
          { href: "/tips-and-strategies", label: "Tips & Strategies" },
          { href: "/vip-program", label: "VIP Program" },
        ]}
      />
      
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
      <NavDropdown 
        label="PROMOTIONS"
        defaultHref="/promotions"
        items={[
          { href: "/promotions", label: "News & Promotions" },
          { href: "/goated-token", label: "Goated Airdrop" },
          { 
            href: "/bonus-codes", 
            label: isAuthenticated ? (
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
            )
          },
        ]}
      />

      {/* Leaderboard dropdown */}
      <NavDropdown 
        label="LEADERBOARDS"
        defaultHref="/leaderboard?period=daily"
        items={[
          { href: "/leaderboard?period=daily", label: "Daily" },
          { href: "/leaderboard?period=weekly", label: "Weekly" },
          { href: "/leaderboard?period=monthly", label: "Monthly" },
          { href: "/leaderboard?period=all_time", label: "All Time" },
        ]}
      />

      {/* Socials dropdown */}
      <NavDropdown 
        label="SOCIALS"
        defaultHref="/socials"
        items={[
          { href: "/telegram", label: "Telegram Community" },
        ]}
      />

      {/* Help/FAQ dropdown */}
      <NavDropdown 
        label="HELP & FAQ"
        defaultHref="/help"
        items={[
          { href: "/help", label: "Help Center" },
          { href: "/faq", label: "FAQ" },
          { href: "/support", label: "Contact Support" },
        ]}
      />

      {user?.isAdmin && (
        <NavDropdown 
          label="ADMIN"
          items={[
            { href: "/admin/user-management", label: "User Management" },
            { href: "/admin/notifications", label: "Notification Management" },
            { href: "/admin/support", label: "Support Management" },
            { href: "/admin/wager-races", label: "Wager Race Management" },
            { href: "/admin/bonus-codes", label: "Bonus Code Management" },
          ]}
        />
      )}
    </div>
  );
}
