import { motion } from 'framer-motion';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet-fix';
import { Button } from '@/components/ui/button';
import { Menu, Gift, Lock } from 'lucide-react';
import { MobileNavLink } from './MobileNavLink';
import { LineMdPlayFilled } from '@/components/icons/LineMdPlayFilled';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { SelectUser } from '@db/schema';

interface MobileNavigationProps {
  user: SelectUser | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileNavigation({ user, open, onOpenChange }: MobileNavigationProps) {
  const isAuthenticated = !!user;
  
  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-[#D7FF00]/10 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-md" />
            <Menu className="h-6 w-6 text-white relative z-10 group-hover:text-[#D7FF00] transition-colors duration-300" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-[300px] bg-[#14151A] border-r border-[#2A2B31] overflow-y-auto p-0 shadow-xl"
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-4 pt-8"
          >
            <div className="px-4 py-2 text-[#D7FF00] font-heading text-base font-bold">
              MENU
            </div>
            <MobileNavLink
              href="/"
              label="HOME"
              onClose={() => onOpenChange(false)}
              isTitle={true}
            />

            <div className="mt-6 px-4 py-2 text-[#D7FF00] font-heading text-sm font-bold border-t border-[#2A2B31]/50 pt-6">
              EVENTS
            </div>
            <MobileNavLink
              href="/wager-races"
              label={
                <div className="flex items-center justify-between w-full">
                  <span>Monthly Race</span>
                  <div className="ml-2 flex items-center gap-1">
                    <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs text-red-500">LIVE</span>
                  </div>
                </div>
              }
              onClose={() => onOpenChange(false)}
            />
            <MobileNavLink
              href="/challenges"
              label={
                <div className="flex items-center justify-between w-full">
                  <span>Challenges</span>
                  <div className="ml-2 flex items-center gap-1">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-green-500">
                      ONGOING
                    </span>
                  </div>
                </div>
              }
              onClose={() => onOpenChange(false)}
            />

            <div className="mt-6 px-4 py-2 text-[#D7FF00] font-heading text-sm font-bold border-t border-[#2A2B31]/50 pt-6">
              GET STARTED
            </div>
            <MobileNavLink
              href="/how-it-works"
              label="How It Works"
              onClose={() => onOpenChange(false)}
            />
            <MobileNavLink
              href="/vip-transfer"
              label="VIP Transfer"
              onClose={() => onOpenChange(false)}
            />
            <MobileNavLink
              href="/tips-and-strategies"
              label="Tips & Strategies"
              onClose={() => onOpenChange(false)}
            />
            <MobileNavLink
              href="/vip-program"
              label="VIP Program"
              onClose={() => onOpenChange(false)}
            />

            <div className="mt-6 px-4 py-2 text-[#D7FF00] font-heading text-sm font-bold border-t border-[#2A2B31]/50 pt-6">
              PROMOTIONS
            </div>
            <MobileNavLink
              href="/promotions"
              label="News & Promotions"
              onClose={() => onOpenChange(false)}
            />
            <MobileNavLink
              href="/goated-token"
              label="Goated Airdrop"
              onClose={() => onOpenChange(false)}
            />
            <MobileNavLink
              href="/bonus-codes"
              label={
                isAuthenticated ? (
                  <div className="flex items-center gap-2">
                    <span>Bonus Codes</span>
                    <Gift className="h-4 w-4" />
                  </div>
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
              }
              onClose={() => onOpenChange(false)}
            />

            <div className="mt-6 px-4 py-2 text-[#D7FF00] font-heading text-sm font-bold border-t border-[#2A2B31]/50 pt-6">
              LEADERBOARDS
            </div>
            <MobileNavLink
              href="/leaderboard?period=daily"
              label="Daily Leaderboard"
              onClose={() => onOpenChange(false)}
            />
            <MobileNavLink
              href="/leaderboard?period=weekly"
              label="Weekly Leaderboard"
              onClose={() => onOpenChange(false)}
            />
            <MobileNavLink
              href="/leaderboard?period=monthly"
              label="Monthly Leaderboard"
              onClose={() => onOpenChange(false)}
            />
            <MobileNavLink
              href="/leaderboard?period=all-time"
              label="All Time Leaderboard"
              onClose={() => onOpenChange(false)}
            />

            <div className="mt-6 px-4 py-2 text-[#D7FF00] font-heading text-sm font-bold border-t border-[#2A2B31]/50 pt-6">
              SOCIALS
            </div>
            <MobileNavLink
              href="/telegram"
              label="Telegram Community"
              onClose={() => onOpenChange(false)}
            />

            <div className="mt-6 px-4 py-2 text-[#D7FF00] font-heading text-sm font-bold border-t border-[#2A2B31]/50 pt-6">
              HELP & SUPPORT
            </div>
            <MobileNavLink
              href="/help"
              label="Help Center"
              onClose={() => onOpenChange(false)}
            />
            <MobileNavLink
              href="/faq"
              label="FAQ"
              onClose={() => onOpenChange(false)}
            />
            <MobileNavLink
              href="/support"
              label="Contact Support"
              onClose={() => onOpenChange(false)}
            />

            {user?.isAdmin && (
              <>
                <div className="mt-6 px-4 py-2 text-[#D7FF00] font-heading text-sm font-bold border-t border-[#2A2B31]/50 pt-6">
                  ADMIN
                </div>
                <MobileNavLink
                  href="/admin/user-management"
                  label="User Management"
                  onClose={() => onOpenChange(false)}
                />
                <MobileNavLink
                  href="/admin/wager-races"
                  label="Wager Race Management"
                  onClose={() => onOpenChange(false)}
                />
                <MobileNavLink
                  href="/admin/bonus-codes"
                  label="Bonus Code Management"
                  onClose={() => onOpenChange(false)}
                />
              </>
            )}

            <div className="mt-6 px-4 border-t border-[#2A2B31]/50 pt-6 pb-8">
              <Button
                onClick={() => {
                  onOpenChange(false);
                  window.open(
                    "https://www.goated.com/r/SPIN",
                    "_blank",
                  );
                }}
                className="w-full relative overflow-hidden group bg-[#D7FF00] text-[#14151A] hover:text-[#D7FF00] transition-colors duration-300 rounded-md flex items-center justify-center gap-2 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="relative z-10">PLAY NOW</span>
                  <div className="relative z-10 play-icon-container">
                    <LineMdPlayFilled className="play-icon" />
                  </div>
                </div>
                <div className="absolute inset-0 bg-[#14151A] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
              </Button>
            </div>
          </motion.div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
