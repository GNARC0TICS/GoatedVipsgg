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

function MVPCard({ 
  timeframe, 
  mvp, 
  isFlipped,
  onFlip
}: { 
  timeframe: typeof timeframes[0], 
  mvp: MVP | undefined,
  isFlipped: boolean,
  onFlip: () => void
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
    <motion.div
      className="relative w-full h-[200px]"
      onClick={onFlip}
      style={{ perspective: "1000px" }}
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={isFlipped ? "back" : "front"}
          initial={{ rotateY: isFlipped ? -180 : 0, opacity: 0 }}
          animate={{ rotateY: isFlipped ? 0 : 0, opacity: 1 }}
          exit={{ rotateY: isFlipped ? 0 : 180, opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute w-full h-full"
          style={{ backfaceVisibility: "hidden" }}
        >
          {!isFlipped ? (
            // Front of card
            <div className="relative h-full">
              <div className="absolute inset-0 bg-gradient-to-b opacity-0 group-hover:opacity-100 transition-all duration-300 blur-sm" 
                style={{ 
                  background: `linear-gradient(to bottom, ${timeframe.colors.primary}20, transparent)`,
                }}
              />
              <div className="relative p-4 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm transition-all duration-300 shadow-lg card-hover h-full"
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
                      <QuickProfile userId={mvp.uid} username={mvp.username}>
                        <h4 className="text-base font-heading text-white truncate hover:text-[#D7FF00] transition-colors cursor-pointer">
                          {mvp.username}
                        </h4>
                      </QuickProfile>
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
          ) : (
            // Back of card - Detailed Stats
            <div className="relative h-full p-4 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm">
              <h4 className="text-lg font-heading text-white mb-4">Detailed Stats</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Win Rate:</span>
                  <span className="text-white">65%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Favorite Game:</span>
                  <span className="text-white">Slots</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Total Games:</span>
                  <span className="text-white">1,234</span>
                </div>
                {/* Add more stats as needed */}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

export function MVPCards() {
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
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
            isFlipped={flippedCards[timeframe.period] || false}
            onFlip={() => handleCardFlip(timeframe.period)}
          />
        </motion.div>
      ))}
    </div>
  );
}