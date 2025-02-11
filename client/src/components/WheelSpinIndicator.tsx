import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Gift, Timer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

export function WheelSpinIndicator() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [timeLeft, setTimeLeft] = useState<string>("");

  const { data: eligibility } = useQuery({
    queryKey: ["wheelSpinEligibility"],
    queryFn: async () => {
      const response = await fetch("/api/wheel/check-eligibility");
      if (!response.ok) throw new Error("Failed to check eligibility");
      return response.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 60000, // Refetch every minute
  });

  useEffect(() => {
    const updateTimer = () => {
      if (!eligibility?.lastSpin) {
        setTimeLeft("Available now!");
        return;
      }

      const now = new Date();
      const lastSpin = new Date(eligibility.lastSpin);
      const nextSpin = new Date(lastSpin);
      nextSpin.setUTCHours(0, 0, 0, 0);
      nextSpin.setUTCDate(nextSpin.getUTCDate() + 1);

      const diff = nextSpin.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft("Available now!");
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${hours}h ${minutes}m`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [eligibility?.lastSpin]);

  if (!isAuthenticated) return null;

  const isAvailable = eligibility?.canSpin;

  return (
    <div 
      className="fixed bottom-36 right-4 z-50 cursor-pointer transform hover:scale-105 transition-all duration-300"
      onClick={() => setLocation("/wheel-challenge")}
    >
      <Card className={`px-4 py-3 flex items-center gap-3 border border-[#2A2B31] ${
        isAvailable ? 'bg-[#1A1B21] hover:border-[#D7FF00] hover:bg-[#1A1B21]/80' : 'bg-[#1A1B21]/50'
      }`}>
        <div className="relative">
          <Gift className={`h-5 w-5 ${isAvailable ? 'text-[#D7FF00]' : 'text-[#8A8B91]'}`} />
          {isAvailable && (
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-[#D7FF00] rounded-full animate-pulse" />
          )}
        </div>
        <div className="flex flex-col">
          <span className={`text-sm font-bold ${isAvailable ? 'text-[#D7FF00]' : 'text-[#8A8B91]'}`}>
            Daily Wheel Spin
          </span>
          <div className="flex items-center gap-1 text-xs text-[#8A8B91]">
            <Timer className="h-3 w-3" />
            <span>{timeLeft}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}