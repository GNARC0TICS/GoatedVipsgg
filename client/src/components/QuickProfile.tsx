import React from "react";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { getTierFromWager, getTierIcon } from "@/lib/tier-utils";
import { useQuery } from "@tanstack/react-query";
import { LoadingSpinner } from "./LoadingSpinner";
import { Sheet, SheetContent } from "@/components/ui/sheet"
import {Button} from "@/components/ui/button";
import {ArrowRight} from "lucide-react";
import {VerificationBadge} from "@/components/VerificationBadge";
import { useLocation } from "wouter";
import { useState } from "react";


interface QuickProfileProps {
  userId: string;
  username: string;
  children: React.ReactNode;
}

export function QuickProfile({ userId, username, children }: QuickProfileProps) {
  const { data: userData } = useQuery({
    queryKey: [`/api/users/${userId}/quick-stats`],
    staleTime: 30000,
  });

  const quickActions = [
    { label: "View Profile", icon: User, href: `/profile/${userId}` },
    { label: "Race History", icon: Trophy, href: `/profile/${userId}/races` },
    { label: "Achievements", icon: Award, href: `/profile/${userId}/achievements` },
    { label: "Settings", icon: Settings, href: `/profile/${userId}/settings` }
  ];
  const { data: leaderboardData, isLoading } = useQuery({
    queryKey: ["/api/affiliate/stats"],
    staleTime: 30000,
  });

  const stats = React.useMemo(() => {
    if (!leaderboardData?.data) return null;

    const userStats = {
      today: leaderboardData.data.today.data.find((p: any) => p.uid === userId)?.wagered?.today || 0,
      this_week: leaderboardData.data.weekly.data.find((p: any) => p.uid === userId)?.wagered?.this_week || 0,
      this_month: leaderboardData.data.monthly.data.find((p: any) => p.uid === userId)?.wagered?.this_month || 0,
      all_time: leaderboardData.data.all_time.data.find((p: any) => p.uid === userId)?.wagered?.all_time || 0,
    };

    const rankings = {
      weekly: (leaderboardData.data.weekly.data.findIndex((p: any) => p.uid === userId) + 1) || undefined,
      monthly: (leaderboardData.data.monthly.data.findIndex((p: any) => p.uid === userId) + 1) || undefined,
      all_time: (leaderboardData.data.all_time.data.findIndex((p: any) => p.uid === userId) + 1) || undefined,
    };

    return { wagered: userStats, rankings };
  }, [leaderboardData, userId]);

  const [open, setOpen] = useState(false);
  const location = useLocation();
  const setLocation = (path:string) => {
    window.location.href = path;
  }

  return (
    <>
      <HoverCard>
        <HoverCardTrigger asChild>
          <span className="cursor-pointer">{children}</span>
        </HoverCardTrigger>
        <HoverCardContent className="w-80 bg-[#1A1B21] border border-[#2A2B31] p-4 z-50"> {/* Added z-50 for higher z-index */}
          {isLoading ? (
            <div className="flex justify-center p-4">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src={getTierIcon(getTierFromWager(stats?.wagered.all_time || 0))}
                  alt="VIP Tier"
                  className="w-8 h-8"
                />
                <div className="flex items-center gap-2">
                  <span className="text-lg font-heading text-white">{username}</span>
                  {userData?.isVerified && <VerificationBadge size="sm" />}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 rounded bg-black/20">
                  <span className="text-white/70 text-sm">Weekly Rank:</span>
                  <span className="text-[#10B981] font-mono">#{stats?.rankings.weekly || '-'}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-black/20">
                  <span className="text-white/70 text-sm">Monthly Rank:</span>
                  <span className="text-[#F59E0B] font-mono">#{stats?.rankings.monthly || '-'}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-black/20">
                  <span className="text-white/70 text-sm">All-Time Rank:</span>
                  <span className="text-[#EC4899] font-mono">#{stats?.rankings.all_time || '-'}</span>
                </div>
              </div>

              <div className="p-3 rounded bg-[#D7FF00]/10 border border-[#D7FF00]/20">
                <div className="flex justify-between items-center">
                  <span className="text-[#D7FF00] text-sm font-semibold">All-Time Wagered:</span>
                  <span className="text-white font-mono font-bold">
                    ${stats?.wagered.all_time.toLocaleString() || '0'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </HoverCardContent>
      </HoverCard>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:w-[540px] bg-[#1A1B21] border-l border-[#2A2B31] p-6">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#2A2B31] flex items-center justify-center">
                <img
                  src={getTierIcon(getTierFromWager(stats?.wagered.all_time || 0))}
                  alt="VIP Tier"
                  className="w-12 h-12"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-heading text-white">{username}</h2>
                  {userData?.isVerified && <VerificationBadge size="lg" />}
                </div>
                <Button
                  variant="link"
                  className="text-[#D7FF00] p-0 h-auto text-sm"
                  onClick={() => setLocation(`/profile/${userId}`)}
                >
                  View Full Profile <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="p-4 rounded-lg bg-black/20">
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Weekly Rank</span>
                  <span className="text-[#D7FF00] font-mono font-bold">#{stats?.rankings.weekly || '-'}</span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-black/20">
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Total Wagered</span>
                  <span className="text-[#D7FF00] font-mono font-bold">${stats?.wagered.all_time.toLocaleString() || '0'}</span>
                </div>
              </div>

              {userData?.isVerified && (
                <div className="p-4 rounded-lg bg-[#D7FF00]/10 border border-[#D7FF00]/20">
                  <div className="flex justify-between items-center">
                    <span className="text-[#D7FF00]">Verified Member</span>
                    <span className="text-white font-mono">Since {new Date(userData.verifiedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}