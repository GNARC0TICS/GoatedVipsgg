import { Link } from 'wouter';
import { User, LogOut, Gift, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PresentIcon } from '@/components/icons/PresentIcon';
import { RankProgressDisplay } from '@/components/RankProgressDisplay';
import { PlayerSearch } from '@/components/PlayerSearch';
import AuthModal from '@/components/AuthModal';
import { LineMdPlayFilled } from '@/components/icons/LineMdPlayFilled';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { dropdownClasses } from '../styles';
import type { SelectUser } from '@db/schema';

interface UserSectionProps {
  user: SelectUser | undefined;
  isMobile: boolean;
  onLogout: () => Promise<void>;
}

export function UserSection({ user, isMobile, onLogout }: UserSectionProps) {
  const isAuthenticated = !!user;

  return (
    <div className="flex items-center space-x-4">
      {/* Bonus code icon for mobile */}
      {user && isMobile && (
        <Link href="/bonus-codes" className="relative group">
          <PresentIcon className="h-6 w-6 transition-transform group-hover:scale-110" />
          {/* Notification dot - show when new bonus codes are available */}
          <div className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full animate-pulse"></div>
        </Link>
      )}
      
      {/* Rank progress for mobile */}
      {user && isMobile && user.totalWagered > 0 && (
        <Link href="/profile?tab=rank" className="mx-1">
          <RankProgressDisplay 
            wagerAmount={user.totalWagered} 
            compact={true} 
          />
        </Link>
      )}
      
      {/* Player search button */}
      <PlayerSearch />
      
      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-[#8A8B91] hover:text-white relative h-8 w-8 md:h-10 md:w-10 transition-all duration-300 rounded-full"
            >
              <div className="absolute inset-0 bg-[#2A2B31]/50 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-full"></div>
              <User className="h-5 w-5 md:h-6 md:w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className={dropdownClasses.content}
          >
            <DropdownMenuLabel className="text-white font-heading">
              My Account
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#2A2B31]/50" />
            <Link href="/profile">
              <DropdownMenuItem className={dropdownClasses.item}>
                Profile
              </DropdownMenuItem>
            </Link>
            <Link href="/notification-preferences">
              <DropdownMenuItem className={dropdownClasses.item}>
                Settings
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator className="bg-[#2A2B31]/50" />
            <DropdownMenuItem
              onClick={onLogout}
              className="px-4 py-2.5 font-medium text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </div>
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
        className="relative overflow-hidden group bg-[#D7FF00] text-[#14151A] hover:text-[#D7FF00] transition-colors duration-300 rounded-md flex items-center gap-2 h-8 md:h-10 px-3 md:px-4 text-sm md:text-base font-heading"
      >
        <div className="flex items-center gap-2">
          <span className="relative z-10">PLAY</span>
          <div className="relative z-10 play-icon-container">
            <LineMdPlayFilled className="play-icon" />
          </div>
        </div>
        <div className="absolute inset-0 bg-[#14151A] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
      </Button>
    </div>
  );
}
