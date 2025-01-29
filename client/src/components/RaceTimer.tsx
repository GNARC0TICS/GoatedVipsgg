import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

// Types for race data
interface RaceParticipant {
  uid: string;
  name: string;
  wagered: number;
  position: number;
}

interface RaceData {
  id: string;
  status: 'upcoming' | 'live' | 'completed';
  endDate: string;
  startDate: string;
  prizePool: number;
  participants: RaceParticipant[];
}

/**
 * RaceTimer Component
 * 
 * Displays the current race status, countdown timer, and top participants
 * Features:
 * - Expandable view showing top 10 participants
 * - Automatic status updates
 * - Smooth transitions between race states
 */
export function RaceTimer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

  // Fetch current race data
  const { data: raceData } = useQuery<RaceData>({
    queryKey: ["/api/wager-races/current"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Calculate and update time remaining
  useEffect(() => {
    if (!raceData?.endDate) return;

    const updateTimer = () => {
      const end = new Date(raceData.endDate);
      const now = new Date();
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("Race Ended");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeft(`${days}d ${hours}h ${minutes}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [raceData?.endDate]);

  if (!raceData) return null;

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
              <span className="font-heading text-white">Monthly Race</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#D7FF00]" />
              <span className="text-white font-mono">{timeLeft}</span>
            </div>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-[#8A8B91] text-sm">
              Prize Pool: ${raceData.prizePool.toLocaleString()}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-[#8A8B91]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[#8A8B91]" />
            )}
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
                {raceData.participants.slice(0, 10).map((participant, index) => (
                  <div 
                    key={participant.uid}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`
                        w-5 h-5 flex items-center justify-center rounded-full
                        ${index === 0 ? 'bg-yellow-500' : ''}
                        ${index === 1 ? 'bg-gray-400' : ''}
                        ${index === 2 ? 'bg-amber-700' : ''}
                        ${index > 2 ? 'bg-[#2A2B31]' : ''}
                      `}>
                        {index + 1}
                      </span>
                      <span className="text-white truncate max-w-[120px]">
                        {participant.name}
                      </span>
                    </div>
                    <span className="text-[#D7FF00] font-mono">
                      ${participant.wagered.toLocaleString()}
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
