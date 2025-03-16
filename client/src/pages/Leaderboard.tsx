import React from "react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { PageTransition } from "@/components/PageTransition";
import type { TimePeriod } from "@/hooks/use-leaderboard";

export default function Leaderboard() {
  const [location] = useLocation();
  const [period, setPeriod] = useState<TimePeriod>("today");
  const [isLoading, setIsLoading] = useState(false); // Start with false to avoid infinite loading
  const [renderKey, setRenderKey] = useState(0); // Use to force re-render of child components

  console.log("Leaderboard page: Initial period =", period);

  useEffect(() => {
    // When period changes, briefly show the loading animation, but ensure it completes
    setIsLoading(true);
    console.log("Leaderboard page: Period changed to", period);
    
    // Use a very short timer to ensure the page shows quickly even if data isn't available
    const timer = setTimeout(() => {
      setIsLoading(false);
      // Force re-render of LeaderboardTable with new key
      setRenderKey(prev => prev + 1);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [period]);

  // Update period based on URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const periodParam = params.get("period");
    console.log("Leaderboard page: URL param =", periodParam);
    
    if (periodParam) {
      const periodMap: Record<string, TimePeriod> = {
        daily: "today",
        weekly: "weekly",
        monthly: "monthly",
        all_time: "all_time"
      };
      if (periodParam in periodMap) {
        console.log("Leaderboard page: Setting period from URL to", periodMap[periodParam]);
        setPeriod(periodMap[periodParam]);
      }
    }
  }, [location]);

  const updatePeriod = (newPeriod: string) => {
    const urlPeriodMap: Record<string, string> = {
      today: "daily",
      weekly: "weekly",
      monthly: "monthly",
      all_time: "all_time"
    };

    setPeriod(newPeriod as TimePeriod);
    window.history.pushState({}, "", `/leaderboard?period=${urlPeriodMap[newPeriod]}`);
  };

  return (
    <PageTransition isLoading={isLoading}>
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
                <source src="/images/Page Headers/WAGERLB.MP4" type="video/mp4" />
              </video>
            </div>

            <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-8 md:mb-12 px-2">
              {[
                { id: "today", label: "DAILY" },
                { id: "weekly", label: "WEEKLY" },
                { id: "monthly", label: "MONTHLY" },
                { id: "all_time", label: "ALL TIME" }
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
            <LeaderboardTable 
              key={`${period}-${renderKey}`} 
              timePeriod={period} 
            />
          </motion.div>
        </main>
      </div>
    </PageTransition>
  );
}