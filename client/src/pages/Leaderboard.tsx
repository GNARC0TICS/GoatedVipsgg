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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Start loading when period changes
    setIsLoading(true);

    // Give the loader time to show the full animation (at least 2.5s)
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, [period]);

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
