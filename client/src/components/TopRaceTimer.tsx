
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ChevronDown, ChevronUp, Clock, AlertCircle, History } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface RaceParticipant {
  uid: string;
  name: string;
  wagered: number;
  position: number;
}

interface RaceData {
  id: string;
  status: 'live' | 'ended' | 'upcoming';
  startDate: string;
  endDate: string;
  prizePool: number;
  title: string;
  participants: RaceParticipant[];
}

export function TopRaceTimer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPrevious, setShowPrevious] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const { toast } = useToast();

  const { 
    data: currentRaceData, 
    error: currentError, 
    isLoading: isCurrentLoading 
  } = useQuery<RaceData>({
    queryKey: ["/api/wager-races/current"],
    queryFn: async () => {
      const response = await fetch('/api/wager-races/current');
      if (!response.ok) {
        throw new Error('Failed to fetch current race data');
      }
      return response.json();
    },
    refetchInterval: 300000, // 5 minutes
    staleTime: 240000, // 4 minutes
    cacheTime: 360000, // 6 minutes
    retry: 3,
    enabled: !showPrevious,
    onError: (error) => {
      console.error('Race data fetch error:', error);
      toast({
        title: "Error loading race data",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive"
      });
    }
  });

  const { 
    data: previousRaceData, 
    error: previousError, 
    isLoading: isPreviousLoading 
  } = useQuery<RaceData>({
    queryKey: ["/api/wager-races/previous"],
    queryFn: async () => {
      const response = await fetch('/api/wager-races/previous');
      if (!response.ok) {
        throw new Error('Failed to fetch previous race data');
      }
      const data = await response.json();
      if (!data) return null;

      return {
        ...data,
        startDate: data.startDate || new Date().toISOString(),
        endDate: data.endDate || new Date().toISOString()
      };
    },
    enabled: showPrevious
  });

  const raceData = showPrevious ? previousRaceData : currentRaceData;
  const error = showPrevious ? previousError : currentError;
  const isLoading = showPrevious ? isPreviousLoading : isCurrentLoading;

  useEffect(() => {
    if (!currentRaceData?.endDate) return;

    const updateTimer = () => {
      const end = new Date(currentRaceData.endDate);
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
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [currentRaceData?.endDate]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long'
    });
  };

  if (error) {
    return null; // Hide on error
  }

  if (isLoading) {
    return (
      <div className="w-full bg-[#1A1B21]/90 backdrop-blur-sm border-b border-[#2A2B31] py-2">
        <div className="container mx-auto px-4 flex items-center justify-center gap-2">
          <div className="animate-spin w-4 h-4 border-2 border-[#D7FF00] border-t-transparent rounded-full" />
          <span className="text-[#8A8B91] text-sm">Loading race data...</span>
        </div>
      </div>
    );
  }

  if (!raceData) {
    return null;
  }

  return (
    <div className="w-full bg-[#1A1B21]/90 backdrop-blur-sm border-b border-[#2A2B31]">
      <div className="container mx-auto px-4">
        <div 
          className="py-2 cursor-pointer"
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
                  <span className="text-white font-mono">{timeLeft}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center mt-1">
            <span className="text-[#8A8B91] text-sm">
              {raceData.id && raceData.id.length === 6 
                ? `${new Date(parseInt(raceData.id.substring(0, 4)), parseInt(raceData.id.substring(4, 6)) - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`
                : formatDate(raceData.startDate)
              }
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

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden border-t border-[#2A2B31]/50"
            >
              <div className="py-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[#8A8B91] text-sm">
                    Prize Pool: ${raceData.prizePool.toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {raceData.participants.slice(0, 6).map((participant, index) => (
                    <div 
                      key={participant.uid}
                      className="flex items-center justify-between py-2 px-3 bg-[#2A2B31]/30 rounded-lg"
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
                </div>
                <div className="text-center mt-4">
                  <Link href="/wager-races" className="inline-block px-4 py-2 bg-[#2A2B31]/50 hover:bg-[#2A2B31] rounded-lg text-[#D7FF00] transition-colors">
                    View Full Leaderboard
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
