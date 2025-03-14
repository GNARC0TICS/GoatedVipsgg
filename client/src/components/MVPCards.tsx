import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { MVPCardComponent, Timeframe, MVP, LeaderboardData, TimeframePeriod } from "./ui/MVPCardComponent";

const timeframes: Timeframe[] = [
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

export function MVPCards() {
  const [openCard, setOpenCard] = useState<TimeframePeriod | null>(null);
  const dialogTimeoutRef = useRef<NodeJS.Timeout>();

  const { data: leaderboardData, isLoading, error } = useQuery<LeaderboardData>({
    queryKey: ["/api/affiliate/stats"],
    queryFn: async () => {
      const response = await fetch("/api/affiliate/stats");
      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard data");
      }
      return response.json();
    },
    staleTime: 30000,
    retry: 3,
  });

  // Debug the response structure
  useEffect(() => {
    if (error) {
      console.error("MVP Cards data fetch error:", error);
    }
    if (leaderboardData) {
      console.log("Leaderboard data structure:", 
        Object.keys(leaderboardData?.data || {})
      );
    }
  }, [leaderboardData, error]);

  // Extract MVPs from the data safely
  const mvps = {
    daily: leaderboardData?.data?.today?.data?.[0] || null,
    weekly: leaderboardData?.data?.weekly?.data?.[0] || null,
    monthly: leaderboardData?.data?.monthly?.data?.[0] || null
  };

  const handleDialogChange = useCallback((open: boolean, period: TimeframePeriod) => {
    if (dialogTimeoutRef.current) {
      clearTimeout(dialogTimeoutRef.current);
    }

    if (open) {
      setOpenCard(period);
    } else {
      dialogTimeoutRef.current = setTimeout(() => {
        setOpenCard(null);
      }, 100);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (dialogTimeoutRef.current) {
        clearTimeout(dialogTimeoutRef.current);
      }
    };
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto px-4 md:px-0">
        {timeframes.map((timeframe) => (
          <motion.div
            key={timeframe.period}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-48 relative overflow-hidden"
          >
            <div className="w-full h-full animate-pulse bg-gradient-to-r from-mvp-base/30 to-mvp-base/50 rounded-card" />
          </motion.div>
        ))}
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-center">
        <h3 className="text-xl font-medium text-mvp-text mb-2">Unable to load MVP data</h3>
        <p className="text-mvp-text-muted">Please try refreshing the page or contact support if the issue persists.</p>
      </div>
    );
  }
  
  // Additional check for missing data structure
  if (!leaderboardData?.data) {
    return (
      <div className="max-w-5xl mx-auto p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-xl text-center">
        <h3 className="text-xl font-medium text-mvp-text mb-2">Leaderboard data is being refreshed</h3>
        <p className="text-mvp-text-muted">Please wait a moment while we update the latest MVP information.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-5xl mx-auto perspective-1000 px-4 md:px-0">
      {timeframes.map((timeframe) => {
        // Extract the MVP data for this timeframe with proper null check
        const mvpData = mvps[timeframe.period as keyof typeof mvps];
        
        // Create a properly structured MVP object only if we have data
        const mvpObject = mvpData ? {
          name: mvpData.name || '', 
          username: mvpData.username || mvpData.name || '', // Fallback to name if username is missing
          uid: mvpData.uid || '',
          wagerAmount: mvpData.wagered[
            timeframe.period === 'daily' ? 'today' : 
            timeframe.period === 'weekly' ? 'this_week' : 
            'this_month'
          ] || 0,
          wagered: mvpData.wagered || {today: 0, this_week: 0, this_month: 0, all_time: 0},
          avatarUrl: mvpData.avatarUrl,
          rank: (leaderboardData?.data[
            timeframe.period === 'daily' ? 'today' : timeframe.period
          ]?.data || [])
            .findIndex((p: MVP) => p.uid === mvpData.uid) + 1 || 1
        } : undefined;

        return (
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
            <MVPCardComponent 
              timeframe={timeframe}
              mvp={mvpObject}
              isOpen={openCard === timeframe.period}
              onOpenChange={(open) => handleDialogChange(open, timeframe.period)}
              leaderboardData={leaderboardData}
            />
          </motion.div>
        );
      })}
    </div>
  );
}