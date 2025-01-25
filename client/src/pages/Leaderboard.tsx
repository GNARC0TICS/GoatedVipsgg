import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import type { TimePeriod } from "@/hooks/use-leaderboard";

export default function Leaderboard() {
  const [location] = useLocation();
  const [period, setPeriod] = useState<TimePeriod>("today");

  // Update period based on URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const periodParam = params.get("period");
    if (periodParam) {
      // Map URL parameters to TimePeriod type
      const periodMap: Record<string, TimePeriod> = {
        daily: "today",
        weekly: "weekly",
        monthly: "monthly",
        all_time: "all_time"
      };
      if (periodParam in periodMap) {
        setPeriod(periodMap[periodParam]);
      }
    }
  }, [location]);

  const updatePeriod = (newPeriod: string) => {
    // Map TimePeriod to URL parameter
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
    <div className="min-h-screen bg-[#14151A]">
      <main className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-[#D7FF00] mb-8">
            LEADERBOARD
          </h1>

          <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-8 md:mb-12 px-2">
            {[
              { id: "today", label: "DAILY" },
              { id: "weekly", label: "WEEKLY" },
              { id: "monthly", label: "MONTHLY" },
              { id: "all_time", label: "ALL TIME" }
            ].map(({ id, label }) => (
              <Button
                key={id}
                variant={period === id ? "default" : "outline"}
                onClick={() => updatePeriod(id)}
                className={`font-heading font-bold ${
                  period === id
                    ? "bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90 shadow-glow-sm"
                    : "border-[#2A2B31] hover:border-[#D7FF00]/50"
                }`}
              >
                {label}
              </Button>
            ))}
          </div>
        </motion.div>

        <div className="rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm p-8">
          <LeaderboardTable key={period} timePeriod={period} />
        </div>
      </main>
    </div>
  );
}