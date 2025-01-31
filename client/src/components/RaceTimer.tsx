import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ChevronDown, ChevronUp, Clock, AlertCircle, History } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Types for race data
interface RaceParticipant {
  uid: string;
  name: string;
  wagered: number;
  position: number;
}

interface RaceData {
  id: string;
  status: 'live';
  startDate: string;
  endDate: string;
  prizePool: number;
  participants: RaceParticipant[];
}

export function RaceTimer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPrevious, setShowPrevious] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
  const { toast } = useToast();

  // Fetch current race data
  const { data: currentRaceData, error: currentError } = useQuery<RaceData>({
    queryKey: ["/api/wager-races/current"],
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 3,
    onSuccess: (data) => {
      if (data?.status === 'completed' || new Date(data?.endDate) < new Date()) {
        setShowCompletionOverlay(true);
      }
    }
  });

  // Fetch previous month's data
  const { data: previousRaceData, error: previousError } = useQuery<RaceData>({
    queryKey: ["/api/wager-races/previous"],
    enabled: showPrevious, // Only fetch when viewing previous month
  });

  // Use the appropriate data based on which view is active
  const raceData = showPrevious ? previousRaceData : currentRaceData;
  const error = showPrevious ? previousError : currentError;

  // Calculate and update time remaining until end of month
  useEffect(() => {
    if (!currentRaceData?.endDate) return;

    const updateTimer = () => {
      const end = new Date(currentRaceData.endDate);
      const now = new Date();
      const diff = end.getTime() - now.getTime();

      if (diff <= 0 || currentRaceData?.status === 'completed') {
        setTimeLeft("Race Ended");
        setShowCompletionOverlay(true);
        
        // Calculate time until next race
        const nextRaceStart = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
        const timeUntilNext = nextRaceStart.getTime() - now.getTime();
        
        const daysUntil = Math.floor(timeUntilNext / (1000 * 60 * 60 * 24));
        const hoursUntil = Math.floor((timeUntilNext % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutesUntil = Math.floor((timeUntilNext % (1000 * 60 * 60)) / (1000 * 60));
        
        setTimeLeft(`Next Race: ${daysUntil}d ${hoursUntil}h ${minutesUntil}m`);
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
  }, [currentRaceData?.endDate]);

  // Error state
  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <div className="bg-destructive/90 backdrop-blur-sm border border-destructive/50 rounded-lg p-4 text-destructive-foreground">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>Unable to load race data</span>
          </div>
        </div>
      </motion.div>
    );
  }

  // Loading or no race data
  if (!raceData) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long'
    });
  };

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
                {showPrevious ? 'Previous Race' : 'Monthly Race'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {!showPrevious && (
                <>
                  <Clock className="h-4 w-4 text-[#D7FF00]" />
                  <span className={`font-mono ${timeLeft.includes('Race Ended') ? 'text-orange-500' : 'text-white'}`}>
                    {timeLeft}
                  </span>
                  {timeLeft.includes('Race Ended') && (
                    <span className="text-sm text-[#D7FF00] ml-2">Next Race: {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString()}</span>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-[#8A8B91] text-sm">
              {formatDate(raceData.startDate)}
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPrevious(!showPrevious);
                }}
                className="p-1 rounded hover:bg-[#2A2B31] transition-colors"
              >
                <History className="h-4 w-4 text-[#8A8B91]" />
              </button>
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
                    Prize Pool: ${raceData.prizePool.toLocaleString()}
                  </span>
                </div>
                {raceData.participants.map((participant, index) => (
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

        {/* Race Completion Overlay */}
        <AnimatePresence>
          {showCompletionOverlay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm rounded-lg flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="p-6 text-center"
              >
                <h3 className="text-[#D7FF00] font-heading mb-4">Race Complete!</h3>
                <div className="space-y-4 mb-4">
                  {raceData.participants.slice(0, 3).map((winner, index) => (
                    <div key={winner.uid} className="flex items-center justify-between bg-[#1A1B21]/80 p-2 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className={`
                          w-6 h-6 flex items-center justify-center rounded-full text-sm font-medium
                          ${index === 0 ? 'bg-yellow-500 text-black' : ''}
                          ${index === 1 ? 'bg-gray-400 text-black' : ''}
                          ${index === 2 ? 'bg-amber-700 text-white' : ''}
                        `}>
                          {index + 1}
                        </span>
                        <span className="text-white">{winner.name}</span>
                      </div>
                      <span className="text-[#D7FF00] font-mono">${winner.wagered.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[#8A8B91] text-sm mb-4">
                  Next race starts on {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString()}
                </p>
                <button
                  onClick={() => setShowCompletionOverlay(false)}
                  className="text-[#D7FF00] text-sm hover:underline"
                >
                  Close
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}