import React, { useMemo } from 'react';
import { Trophy, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect as ReactuseEffect } from "react";

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

interface APIResponse {
  data: {
    today: { data: MVP[] };
    weekly: { data: MVP[] };
    monthly: { data: MVP[] };
    all_time: { data: MVP[] };
  };
}

const timeframes = [
  { 
    title: "Daily MVP", 
    period: "daily", 
    colors: {
      primary: "#8B5CF6",
      accent: "#7C3AED",
      shine: "#A78BFA"
    }
  },
  { 
    title: "Weekly MVP", 
    period: "weekly", 
    colors: {
      primary: "#10B981",
      accent: "#059669",
      shine: "#34D399"
    }
  },
  { 
    title: "Monthly MVP", 
    period: "monthly", 
    colors: {
      primary: "#F59E0B",
      accent: "#D97706",
      shine: "#FBBF24"
    }
  }
];

function MVPCard({ 
  timeframe, 
  mvp,
  leaderboardData
}: { 
  timeframe: typeof timeframes[0], 
  mvp: MVP | undefined,
  leaderboardData: APIResponse | undefined
}) {
  const [showIncrease, setShowIncrease] = useState(false);

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
      className="w-full h-[200px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="h-full">
        <div className="p-4 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm h-full">
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
                  loading="lazy"
                  src={mvp.avatarUrl} 
                  alt={mvp.username}
                  className="w-10 h-10 rounded-full border-2"
                  style={{ borderColor: timeframe.colors.accent }}
                />
              ) : (
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${timeframe.colors.primary}20` }}
                >
                  <span 
                    className="text-base font-bold"
                    style={{ color: timeframe.colors.shine }}
                  >
                    {mvp.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-grow min-w-0">
                <h4 className="text-base font-heading text-white truncate">
                  {mvp.username}
                </h4>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm bg-black/40 p-2 rounded-lg">
              <span className="text-white/70">Period Total:</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-mono font-bold">
                  ${mvp.wagerAmount.toLocaleString()}
                </span>
                {showIncrease && (
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export const MVPCardMemo = React.memo(MVPCard);

export function MVPCards() {
  const { data: leaderboardData, isLoading } = useQuery<APIResponse>({
    queryKey: ["/api/affiliate/stats"],
    staleTime: 30000,
  });

  const mvps = useMemo(() => ({
    daily: leaderboardData?.data?.today?.data[0],
    weekly: leaderboardData?.data?.weekly?.data[0],
    monthly: leaderboardData?.data?.monthly?.data[0]
  }), [leaderboardData]);

  if (isLoading || !mvps?.daily) {
    return (
      <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {timeframes.map((timeframe) => (
          <motion.div
            key={timeframe.period}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 bg-[#1A1B21]/50 h-48 rounded-xl"
          >
            <div className="w-full h-full animate-pulse bg-gradient-to-r from-[#1A1B21]/30 to-[#1A1B21]/50" />
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-5xl mx-auto px-4 md:px-0">
      {timeframes.map((timeframe) => (
        <motion.div
          key={timeframe.period}
          className="relative"
        >
          <MVPCardMemo 
            timeframe={timeframe}
            mvp={mvps[timeframe.period as keyof typeof mvps] as MVP}
            leaderboardData={leaderboardData}
          />
        </motion.div>
      ))}
    </div>
  );
}