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
import { LeaderboardEntry, LeaderboardTableProps, LoadingSpinnerProps } from "@/components/types";

function debounce<T extends (...args: any[]) => any>(func: T, wait: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  function debouncedFunction(this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func.apply(this, args);
      timeoutId = undefined;
    }, wait);
  }

  debouncedFunction.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  return debouncedFunction as T & { cancel: () => void };
}


export default function Leaderboard() {
  const [location] = useLocation();
  const [period, setPeriod] = useState<TimePeriod>("today");
  const { startLoadingFor, stopLoadingFor, isLoadingFor } = useLoading();
  const loadingKey = `leaderboard-page-${period}`;

  const { 
    data: leaderboardData, 
    isLoading: dataLoading, 
    error,
    refetch,
    errorDetails: apiErrorDetails
  } = useLeaderboard(period) as {
    data: LeaderboardEntry[];
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<any>;
    errorDetails: string;
  };
  
  // Default error message if none provided
  const errorDetails = error ? error.message : 'An unknown error occurred';

  const isPageLoading = dataLoading || isLoadingFor(loadingKey);

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

  const updatePeriod = (newPeriod: TimePeriod) => {
    const urlPeriodMap: Record<string, string> = {
      today: "daily",
      weekly: "weekly",
      monthly: "monthly",
      all_time: "all_time",
    };

    setPeriod(newPeriod);
    window.history.pushState(
      {},
      "",
      `/leaderboard?period=${urlPeriodMap[newPeriod]}`,
    );
  };

  const handleRetry = useCallback(() => {
    console.log('Retrying leaderboard data fetch');
    startLoadingFor(loadingKey, "spinner", 500);
    refetch().catch((err: Error) => {
      console.error('Retry failed:', err);
      stopLoadingFor(loadingKey);
    });
  }, [refetch, loadingKey, startLoadingFor, stopLoadingFor]);

  const loadLeaderboardData = useCallback(() => {
    startLoadingFor(loadingKey, "spinner", 500);
    refetch().finally(() => stopLoadingFor(loadingKey));
  }, [refetch, loadingKey, startLoadingFor, stopLoadingFor]);

  useEffect(() => {
    const debouncedLoad = debounce(loadLeaderboardData, 1000); 
    debouncedLoad();
    return () => debouncedLoad.cancel?.();
  }, [loadLeaderboardData]);


  if (error || !leaderboardData) {
    return (
      <div className="min-h-screen bg-background-DEFAULT flex items-center justify-center flex-col">
        <div className="text-red-500 mb-4">Failed to load leaderboard data</div>
        <div className="text-white/60 mb-6 text-sm max-w-md text-center">
          {errorDetails || 'Please ensure you are logged in and try again.'}
        </div>
        <Button
          onClick={handleRetry}
          className="bg-primary-DEFAULT text-black hover:bg-primary-hover"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="container py-8 space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">Leaderboard</h1>
          <div className="flex gap-2">
            <Button
              variant={period === "today" ? "default" : "outline"}
              onClick={() => updatePeriod("today")}
              className={period === "today" ? "bg-[#D7FF00] text-black" : ""}
            >
              Daily
            </Button>
            <Button
              variant={period === "weekly" ? "default" : "outline"}
              onClick={() => updatePeriod("weekly")}
              className={period === "weekly" ? "bg-[#D7FF00] text-black" : ""}
            >
              Weekly
            </Button>
            <Button
              variant={period === "monthly" ? "default" : "outline"}
              onClick={() => updatePeriod("monthly")}
              className={period === "monthly" ? "bg-[#D7FF00] text-black" : ""}
            >
              Monthly
            </Button>
            <Button
              variant={period === "all_time" ? "default" : "outline"}
              onClick={() => updatePeriod("all_time")}
              className={period === "all_time" ? "bg-[#D7FF00] text-black" : ""}
            >
              All Time
            </Button>
          </div>
        </div>

        {isPageLoading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <LoadingSpinner size={40} label={false} fullscreen={false} />
          </div>
        ) : (
          <>
            {leaderboardData && leaderboardData.length > 0 ? (
              <LeaderboardTable 
                data={leaderboardData as LeaderboardEntry[]} 
                period={period} 
              />
            ) : (
              <div className="rounded-lg border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm p-8 text-center">
                <div className="text-xl font-semibold mb-2">No Data Available</div>
                <p className="text-muted-foreground max-w-md mx-auto">
                  There's no leaderboard data available for the {period} period. Please try another time period or check back later.
                </p>
                <Button 
                  onClick={handleRetry} 
                  variant="outline" 
                  className="mt-4"
                >
                  Refresh Data
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}