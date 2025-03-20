import React from "react";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { PageTransition } from "@/components/PageTransition";
import { useLeaderboard, type TimePeriod } from "@/hooks/use-leaderboard";
import { useLoading } from "@/contexts/LoadingContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function Leaderboard() {
  const [location] = useLocation();
  const [period, setPeriod] = useState<TimePeriod>("today");
  const { startLoadingFor, stopLoadingFor, isLoadingFor } = useLoading();
  const loadingKey = `leaderboard-page-${period}`;
  
  // Use the enhanced leaderboard hook with better error handling
  const { 
    data: leaderboardData, 
    isLoading: dataLoading, 
    error, 
    errorDetails = null,
    refetch = () => Promise.resolve() 
  } = useLeaderboard(period) as {
    data: any[];
    isLoading: boolean;
    error: Error | null;
    errorDetails?: string | null;
    refetch?: () => Promise<any>;
  };
  
  // Combine our loading states
  const isPageLoading = dataLoading || isLoadingFor(loadingKey);
  
  // Handle period changes with loading state
  useEffect(() => {
    console.log(`Period changed to ${period}, setting loading state`);
    
    // Start loading when period changes
    startLoadingFor(loadingKey, "spinner", 500);
    
    // Add a minimum loading time to prevent flicker
    const timer = setTimeout(() => {
      stopLoadingFor(loadingKey);
    }, 500); // Reduced from 1000ms for better user experience
    
    return () => {
      clearTimeout(timer);
      // Ensure loading state is cleaned up if component unmounts
      if (isLoadingFor(loadingKey)) {
        stopLoadingFor(loadingKey);
      }
    };
  }, [period, loadingKey, startLoadingFor, stopLoadingFor, isLoadingFor]);
  
  // Log data for debugging
  useEffect(() => {
    if (leaderboardData) {
      console.log(`Leaderboard data received for ${period}:`, leaderboardData.length);
    }
    if (error) {
      console.error(`Leaderboard error for ${period}:`, error, errorDetails);
    }
  }, [leaderboardData, error, errorDetails, period]);
  
  // Retry loading on error
  const handleRetry = useCallback(() => {
    console.log('Retrying leaderboard data fetch');
    startLoadingFor(loadingKey, "spinner", 500);
    refetch().catch((err: Error) => {
      console.error('Retry failed:', err);
      stopLoadingFor(loadingKey);
    });
  }, [refetch, loadingKey, startLoadingFor, stopLoadingFor]);

  // Update period based on URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const periodParam = params.get("period");
    if (periodParam) {
      const periodMap: Record<string, TimePeriod> = {
        daily: "today",
        weekly: "weekly",
        monthly: "monthly",
        all_time: "all_time",
      };
      if (periodParam in periodMap) {
        setPeriod(periodMap[periodParam]);
      }
    }
  }, [location]);

  const updatePeriod = (newPeriod: string) => {
    const urlPeriodMap: Record<string, string> = {
      today: "daily",
      weekly: "weekly",
      monthly: "monthly",
      all_time: "all_time",
    };

    setPeriod(newPeriod as TimePeriod);
    window.history.pushState(
      {},
      "",
      `/leaderboard?period=${urlPeriodMap[newPeriod]}`,
    );
  };

  // Show error state if needed
  if (error && !isPageLoading) {
    return (
      <div className="min-h-screen bg-[#14151A] flex items-center justify-center flex-col">
        <div className="text-red-500 mb-4">Failed to load leaderboard data</div>
        <div className="text-white/60 mb-6 text-sm max-w-md text-center">
          {errorDetails || 'An unexpected error occurred while loading the leaderboard.'}
        </div>
        <Button
          onClick={handleRetry}
          className="bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <PageTransition isLoading={isPageLoading}>
      <div className="min-h-screen bg-[#14151A]">
        <main className="container mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="mb-8">
              <video
                autoPlay
                muted
                playsInline
                className="mx-auto h-48 md:h-64 w-auto object-contain"
              >
                <source
                  src="/images/Page Headers/WAGERLB.MP4"
                  type="video/mp4"
                />
              </video>
            </div>

            <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-8 md:mb-12 px-2">
              {[
                { id: "today", label: "DAILY" },
                { id: "weekly", label: "WEEKLY" },
                { id: "monthly", label: "MONTHLY" },
                { id: "all_time", label: "ALL TIME" },
              ].map(({ id, label }) => (
                <motion.div
                  key={id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant={period === id ? "default" : "outline"}
                    onClick={() => updatePeriod(id)}
                    className={`font-heading font-bold transition-all duration-300 ${
                      period === id
                        ? "bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90 shadow-glow-sm"
                        : "border-[#2A2B31] hover:border-[#D7FF00]/50 hover:text-[#D7FF00]"
                    }`}
                  >
                    {label}
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm p-8"
          >
            <LeaderboardTable key={period} timePeriod={period} />
          </motion.div>
        </main>
      </div>
    </PageTransition>
  );
}
