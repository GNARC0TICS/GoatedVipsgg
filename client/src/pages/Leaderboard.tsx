
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LeaderboardTable } from "@/components/LeaderboardTable";

export default function Leaderboard() {
  const [location] = useLocation();
  const [period, setPeriod] = useState("daily");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const periodParam = params.get("period");
    if (periodParam) {
      setPeriod(periodParam);
    }
  }, [location]);

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
          
          <div className="flex justify-center gap-4 mb-12">
            {[
              { id: "daily", label: "DAILY" },
              { id: "weekly", label: "WEEKLY" },
              { id: "monthly", label: "MONTHLY" },
              { id: "all_time", label: "ALL TIME" }
            ].map(({ id, label }) => (
              <Button
                key={id}
                variant={period === id ? "default" : "outline"}
                onClick={() => {
                  setPeriod(id);
                  window.history.pushState({}, "", `/leaderboard?period=${id}`);
                }}
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
          <LeaderboardTable />
        </div>
      </main>
    </div>
  );
}
