import React, { useState, useEffect, MouseEvent } from 'react';
import { motion } from "framer-motion";
import { Trophy, TrendingUp } from "lucide-react";
import { QuickProfile } from "../QuickProfile";
import { Dialog, DialogContent } from "./dialog";
import { getTierFromWager, getTierIcon } from "@/lib/tier-utils";

export type MVP = {
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
  name?: string;
};

export type TimeframePeriod = "daily" | "weekly" | "monthly";

export type Timeframe = {
  title: string;
  period: TimeframePeriod;
  colors: {
    primary: string;
    accent: string;
    shine: string;
  };
};

export interface LeaderboardData {
  data: {
    today: { data: MVP[] };
    weekly: { data: MVP[] };
    monthly: { data: MVP[] };
    all_time: { data: MVP[] };
  };
}

export function MVPCardComponent({
  timeframe,
  mvp,
  isOpen,
  onOpenChange,
  leaderboardData
}: {
  timeframe: Timeframe;
  mvp: MVP | undefined;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  leaderboardData: LeaderboardData | undefined;
}) {
  const [showIncrease, setShowIncrease] = useState(false);

  useEffect(() => {
    if (mvp?.lastWagerChange) {
      setShowIncrease(true);
      const timer = setTimeout(() => setShowIncrease(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [mvp?.lastWagerChange]);

  if (!mvp) {
    return (
      <div className="h-48 animate-pulse rounded-card bg-mvp-base border border-mvp-border">
        <div className="h-full"></div>
      </div>
    );
  }

  // Get the correct color classes based on the timeframe
  const periodColorClass = 
    timeframe.period === "daily" ? "text-mvp-daily-primary" :
    timeframe.period === "weekly" ? "text-mvp-weekly-primary" :
    "text-mvp-monthly-primary";
    
  // Handler for card click
  const handleCardClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.username-trigger')) {
      onOpenChange(true);
    }
  };

  return (
    <>
      <motion.div
        className="relative w-full h-[200px] cursor-pointer"
        onClick={() => onOpenChange(true)}
      >
        <div className="relative h-full">
          <div 
            className="absolute inset-0 bg-gradient-to-b opacity-0 group-hover:opacity-100 transition-all duration-300 blur-sm" 
            style={{ 
              background: `linear-gradient(to bottom, ${timeframe.colors.primary}20, transparent)`,
            }}
          />
          <div 
            className="relative h-full cursor-pointer backdrop-blur-sm transition-all duration-300 shadow-lg rounded-card border border-mvp-border bg-mvp-base/50 p-4"
            onClick={handleCardClick}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className={periodColorClass} />
                <h3 className="text-lg font-heading text-mvp-text">{timeframe.title}</h3>
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
                      <h4 className="text-base font-heading text-mvp-text truncate hover:text-brand-yellow transition-colors cursor-pointer username-trigger">
                        {mvp.username}
                      </h4>
                    </QuickProfile>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm bg-black/40 p-2 rounded-lg">
                <span className="text-mvp-text-muted">Period Total:</span>
                <div className="flex items-center gap-2 text-mvp-text font-mono font-bold">
                  ${mvp.wagerAmount.toLocaleString()}
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
        <DialogContent className="bg-mvp-base border-mvp-border max-w-[95vw] md:max-w-2xl w-full mx-4 md:mx-0 animate-in zoom-in-90 duration-300">
          <div className="relative p-6 rounded-xl bg-gradient-to-b from-mvp-base/80 to-mvp-base/50 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-b from-mvp-border/20 to-transparent opacity-50 rounded-xl" />
            <div className="relative">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <img 
                    src={getTierIcon(getTierFromWager(mvp.wagered.all_time))}
                    alt="VIP Tier"
                    className="w-8 h-8"
                  />
                  <h4 className="text-xl md:text-2xl font-heading text-mvp-text">{mvp.username}</h4>
                </div>
                <div className="flex items-center gap-2 text-xl font-heading text-mvp-text">
                  <Trophy className="w-5 h-5 text-brand-yellow" />
                  Player Statistics
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { 
                    label: "Daily Rank", 
                    value: leaderboardData?.data?.today?.data?.findIndex((p: MVP) => p.uid === mvp.uid) !== undefined 
                            ? `#${leaderboardData?.data?.today?.data.findIndex((p: MVP) => p.uid === mvp.uid) + 1}` 
                            : '-', 
                    color: "#8B5CF6" 
                  },
                  { 
                    label: "Weekly Rank", 
                    value: leaderboardData?.data?.weekly?.data?.findIndex((p: MVP) => p.uid === mvp.uid) !== undefined 
                            ? `#${leaderboardData?.data?.weekly?.data.findIndex((p: MVP) => p.uid === mvp.uid) + 1}` 
                            : '-', 
                    color: "#10B981" 
                  },
                  { 
                    label: "Monthly Rank", 
                    value: leaderboardData?.data?.monthly?.data?.findIndex((p: MVP) => p.uid === mvp.uid) !== undefined 
                            ? `#${leaderboardData?.data?.monthly?.data.findIndex((p: MVP) => p.uid === mvp.uid) + 1}` 
                            : '-', 
                    color: "#F59E0B" 
                  },
                  { 
                    label: "All-Time Rank", 
                    value: leaderboardData?.data?.all_time?.data?.findIndex((p: MVP) => p.uid === mvp.uid) !== undefined 
                            ? `#${leaderboardData?.data?.all_time?.data.findIndex((p: MVP) => p.uid === mvp.uid) + 1}` 
                            : '-', 
                    color: "#EC4899" 
                  }
                ].map((stat, index) => (
                  <div key={index} className="flex justify-between items-center p-2 rounded-lg bg-black/20 hover:bg-black/30 transition-colors">
                    <span className="text-mvp-text-muted text-sm">{stat.label}:</span>
                    <span className="text-mvp-text font-mono font-bold" style={{ color: stat.color }}>
                      {stat.value}
                    </span>
                  </div>
                ))}
                <div className="mt-6 p-3 rounded-lg bg-brand-yellow/10 border border-brand-yellow/20">
                  <div className="flex justify-between items-center">
                    <span className="text-brand-yellow text-sm font-semibold">All-Time Wagered:</span>
                    <span className="text-mvp-text font-mono font-bold text-lg">
                      ${mvp.wagered.all_time.toLocaleString()}
                    </span>
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