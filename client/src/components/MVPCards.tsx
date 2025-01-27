import React from 'react';
import { Trophy, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect as ReactuseEffect } from "react";
import { QuickProfile } from "./QuickProfile";

type MVP = {
  username: string;
  uid: string;
  wagerAmount: number;
  avatarUrl?: string;
  rank: number;
  wageredAllTime?: number;
  lastWagerChange?: number;
  wagered: {
    today: number;
    this_week: number;
    this_month: number;
    all_time: number;
  };
};

const timeframes = [
  { 
    title: "Daily MVP", 
    period: "daily", 
    colors: {
      primary: "#8B5CF6", // violet
      accent: "#7C3AED",
      shine: "#A78BFA"
    }
  },
  { 
    title: "Weekly MVP", 
    period: "weekly", 
    colors: {
      primary: "#10B981", // emerald
      accent: "#059669",
      shine: "#34D399"
    }
  },
  { 
    title: "Monthly MVP", 
    period: "monthly", 
    colors: {
      primary: "#F59E0B", // amber
      accent: "#D97706",
      shine: "#FBBF24"
    }
  }
];

import { Dialog, DialogContent } from "./ui/dialog";

function MVPCard({ 
  timeframe, 
  mvp, 
  isOpen,
  onOpenChange,
  leaderboardData
}: { 
  timeframe: typeof timeframes[0], 
  mvp: MVP | undefined,
  isOpen: boolean,
  onOpenChange: (open: boolean) => void,
  leaderboardData: any
}) {
  const [showIncrease, setShowIncrease] = useState(false);

  // Show increase indicator for 10 seconds when wager amount changes
  ReactuseEffect(() => {
    if (mvp?.lastWagerChange) {
      setShowIncrease(true);
      const timer = setTimeout(() => setShowIncrease(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [mvp?.lastWagerChange]);

  if (!mvp) {
    return (
      <div className="p-6 bg-[#1A1B21]/50 animate-pulse h-48 rounded-xl">
        <div className="h-full"></div>
      </div>
    );
  }

  return (
    <>
      <motion.div
        className="relative w-full h-[200px] cursor-pointer"
        onClick={() => onOpenChange(true)}
      >
            // Front of card
            <div className="relative h-full">
              <div className="absolute inset-0 bg-gradient-to-b opacity-0 group-hover:opacity-100 transition-all duration-300 blur-sm" 
                style={{ 
                  background: `linear-gradient(to bottom, ${timeframe.colors.primary}20, transparent)`,
                }}
              />
              <div 
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (!target.closest('.username-trigger')) {
                    onFlip();
                  }
                }}
                className="relative p-4 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm transition-all duration-300 shadow-lg card-hover h-full cursor-pointer"
                style={{
                  '--hover-border-color': `${timeframe.colors.primary}80`,
                  '--hover-shadow-color': `${timeframe.colors.primary}40`
                } as React.CSSProperties}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Trophy style={{ color: timeframe.colors.primary }} className="h-5 w-5" />
                    <h3 className="text-lg font-heading text-white">{timeframe.title}</h3>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {mvp.avatarUrl ? (
                      <img 
                        src={mvp.avatarUrl} 
                        alt={mvp.username}
                        className="w-10 h-10 rounded-full border-2"
                        style={{ borderColor: timeframe.colors.accent }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${timeframe.colors.primary}20` }}>
                        <span className="text-base font-bold"
                              style={{ color: timeframe.colors.shine }}>
                          {mvp.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-grow min-w-0">
                      <div onClick={(e) => e.stopPropagation()}>
                      <QuickProfile userId={mvp.uid} username={mvp.username}>
                          <h4 className="text-base font-heading text-white truncate hover:text-[#D7FF00] transition-colors cursor-pointer username-trigger">
                            {mvp.username}
                          </h4>
                      </QuickProfile>
                    </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm bg-black/40 p-2 rounded-lg">
                    <span className="text-white/70">Period Total:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono font-bold">
                        ${mvp.wagerAmount.toLocaleString()}
                      </span>
                      {showIncrease && (
                        <TrendingUp className="h-4 w-4 text-emerald-500 animate-pulse" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="bg-[#1A1B21] border-[#2A2B31] max-w-2xl w-full">
          <div className="relative p-6 rounded-xl bg-gradient-to-b from-[#1A1B21]/80 to-[#1A1B21]/50 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-b from-[#2A2B31]/20 to-transparent opacity-50 rounded-xl" />
              <div className="relative">
                <h4 className="text-xl font-heading text-white mb-6 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[#D7FF00]" />
                  Player Statistics
                </h4>
                <div className="space-y-4">
                  {[
                    { label: "Daily Rank", value: leaderboardData?.data?.today?.data.findIndex((p: any) => p.uid === mvp.uid) + 1 || '-', color: "#8B5CF6" },
                    { label: "Weekly Rank", value: leaderboardData?.data?.weekly?.data.findIndex((p: any) => p.uid === mvp.uid) + 1 || '-', color: "#10B981" },
                    { label: "Monthly Rank", value: leaderboardData?.data?.monthly?.data.findIndex((p: any) => p.uid === mvp.uid) + 1 || '-', color: "#F59E0B" },
                    { label: "All-Time Rank", value: leaderboardData?.data?.all_time?.data.findIndex((p: any) => p.uid === mvp.uid) + 1 || '-', color: "#EC4899" }
                  ].map((stat, index) => (
                    <div key={index} className="flex justify-between items-center p-2 rounded-lg bg-black/20 hover:bg-black/30 transition-colors">
                      <span className="text-white/80 text-sm">{stat.label}:</span>
                      <span className="text-white font-mono font-bold" style={{ color: stat.color }}>
                        #{stat.value}
                      </span>
                    </div>
                  ))}
                  <div className="mt-6 p-3 rounded-lg bg-[#D7FF00]/10 border border-[#D7FF00]/20">
                    <div className="flex justify-between items-center">
                      <span className="text-[#D7FF00] text-sm font-semibold">All-Time Wagered:</span>
                      <span className="text-white font-mono font-bold text-lg">
                        ${mvp.wagered.all_time.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function MVPCards() {
  const [openCard, setOpenCard] = useState<string | null>(null);
  const { data: leaderboardData, isLoading } = useQuery({
    queryKey: ["/api/affiliate/stats"],
    staleTime: 30000,
  });

  const mvps = {
    daily: leaderboardData?.data?.today?.data[0],
    weekly: leaderboardData?.data?.weekly?.data[0],
    monthly: leaderboardData?.data?.monthly?.data[0]
  };

  const handleCardFlip = (period: string) => {
    setFlippedCards(prev => ({
      ...prev,
      [period]: !prev[period]
    }));
  };

  if (isLoading || !mvps?.daily) {
    return (
      <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {timeframes.map((timeframe) => (
          <div key={timeframe.period} className="p-6 bg-[#1A1B21]/50 animate-pulse h-48 rounded-xl">
            <div className="h-full"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto perspective-1000">
      {timeframes.map((timeframe) => (
        <motion.div
          key={timeframe.period}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          whileHover={{ 
            scale: 1.02
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30
          }}
          className="group relative transform transition-all duration-300"
        >
          <MVPCard 
            timeframe={timeframe}
            mvp={mvps[timeframe.period as keyof typeof mvps] ? {
              username: mvps[timeframe.period as keyof typeof mvps]?.name || '',
              uid: mvps[timeframe.period as keyof typeof mvps]?.uid || '',
              wagerAmount: mvps[timeframe.period as keyof typeof mvps]?.wagered[timeframe.period === 'daily' ? 'today' : timeframe.period === 'weekly' ? 'this_week' : 'this_month'] || 0,
              wagered: mvps[timeframe.period as keyof typeof mvps]?.wagered || {today:0, this_week:0, this_month:0, all_time:0}
            } : undefined}
            isOpen={openCard === timeframe.period}
            onOpenChange={(open) => setOpenCard(open ? timeframe.period : null)}
            leaderboardData={leaderboardData}
          />
        </motion.div>
      ))}
    </div>
  );
}