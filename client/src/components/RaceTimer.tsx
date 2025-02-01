import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

// Types for API response
interface WagerData {
  today: number;
  this_week: number;
  this_month: number;
  all_time: number;
}

interface Participant {
  uid: string;
  name: string;
  wagered: WagerData;
}

interface LeaderboardData {
  status: string;
  metadata: {
    totalUsers: number;
    lastUpdated: string;
  };
  data: {
    today: { data: Participant[] };
    weekly: { data: Participant[] };
    monthly: { data: Participant[] };
    all_time: { data: Participant[] };
  };
}

// Add default fallback data
const fallbackData: LeaderboardData = {
  status: "success",
  metadata: {
    totalUsers: 0,
    lastUpdated: new Date().toISOString(),
  },
  data: {
    today: { data: [] },
    weekly: { data: [] },
    monthly: { data: [] },
    all_time: { data: [] },
  },
};

export function RaceTimer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

  // Use the same query as the monthly race page
  const { data: leaderboardData, isLoading } = useQuery<LeaderboardData>({
    queryKey: ["/api/affiliate/stats"],
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
    retry: 3,
    initialData: fallbackData,
  });

  // Calculate time left
  useEffect(() => {
    function updateTimer() {
      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const diff = endOfMonth.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("Race Ended");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeft(`${days}d ${hours}h ${minutes}m`);
    }

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long'
    });
  }, []);

  // Add loading state
  if (isLoading || !leaderboardData) {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-80 bg-[#1A1B21]/90 backdrop-blur-sm border border-[#2A2B31] rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-[#D7FF00]" />
          <span className="font-heading text-white">Loading race data...</span>
        </div>
      </div>
    );
  }

  const startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const participants = leaderboardData.data.monthly.data
    .slice(0, 10)
    .map((participant, index) => ({
      ...participant,
      position: index + 1,
    }));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 right-4 z-50 w-80"
    >
      <div className="bg-[#1A1B21]/90 backdrop-blur-sm border border-[#2A2B31] rounded-lg shadow-lg overflow-hidden">
        {/* Header with Timer */}
        <div 
          className="p-4 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-[#D7FF00]" />
              <span className="font-heading text-white">
                Monthly Race
              </span>
            </div>
            {timeLeft && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#D7FF00]" />
                <span className="text-white font-mono">{timeLeft}</span>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-[#8A8B91] text-sm">
              {formatDate(startDate)}
            </span>
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-[#8A8B91]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[#8A8B91]" />
              )}
            </div>
          </div>
        </div>

        {/* Expandable Leaderboard */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 border-t border-[#2A2B31]">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[#8A8B91] text-sm">
                    Prize Pool: $500
                  </span>
                </div>
                {participants.map((participant, index) => (
                  <div 
                    key={participant.uid}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`
                        w-5 h-5 flex items-center justify-center rounded-full text-sm font-medium
                        ${index === 0 ? 'bg-yellow-500 text-black' : ''}
                        ${index === 1 ? 'bg-gray-400 text-black' : ''}
                        ${index === 2 ? 'bg-amber-700 text-white' : ''}
                        ${index > 2 ? 'bg-[#2A2B31] text-white' : ''}
                      `}>
                        {index + 1}
                      </span>
                      <span className="text-white truncate max-w-[120px]">
                        {participant.name}
                      </span>
                    </div>
                    <span className="text-[#D7FF00] font-mono">
                      ${participant.wagered.this_month.toLocaleString()}
                    </span>
                  </div>
                ))}
                <Link href="/wager-races">
                  <a className="block text-center text-[#D7FF00] mt-4 hover:underline">
                    View Full Leaderboard
                  </a>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}