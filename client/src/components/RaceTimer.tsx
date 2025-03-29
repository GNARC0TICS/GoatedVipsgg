
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle,
  History,
  X,
} from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

interface RaceParticipant {
  uid: string;
  name: string;
  wagered: number;
  position: number;
}

interface RaceData {
  id: string;
  status: "live" | "ended" | "upcoming";
  startDate: string;
  endDate: string;
  prizePool: number;
  title: string;
  participants: RaceParticipant[];
}

interface RaceTimerProps {
  onClose?: () => void;
}

export function RaceTimer({ onClose }: RaceTimerProps = {}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPrevious, setShowPrevious] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const { toast } = useToast();

  const {
    data: currentRaceData,
    error: currentError,
    isLoading: isCurrentLoading,
  } = useQuery<RaceData, Error>({
    queryKey: ["/api/wager-races/current"],
    queryFn: async () => {
      const response = await fetch("/api/wager-races/current");
      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(`Failed to fetch current race data: ${errorMessage}`);
      }
      return response.json();
    },
    refetchInterval: 30000,
    retry: 3,
    enabled: !showPrevious,
  });

  useEffect(() => {
    if (currentError) {
      console.error("Race data fetch error:", currentError);
      toast({
        title: "Error loading race data",
        description: currentError.message || "Please try again later",
        variant: "destructive",
      });
    }
  }, [currentError, toast]);

  const {
    data: previousRaceData,
    error: previousError,
    isLoading: isPreviousLoading,
  } = useQuery<RaceData, Error>({
    queryKey: ["/api/wager-races/previous"],
    queryFn: async () => {
      const response = await fetch("/api/wager-races/previous");
      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(`Failed to fetch previous race data: ${errorMessage}`);
      }
      const data = await response.json();
      if (!data) return null;

      return {
        ...data,
        startDate: data.startDate || new Date().toISOString(),
        endDate: data.endDate || new Date().toISOString(),
      };
    },
    enabled: showPrevious,
  });

  useEffect(() => {
    if (previousError && showPrevious) {
      console.error("Previous race data fetch error:", previousError);
      toast({
        title: "Error loading previous race data",
        description: previousError.message || "Please try again later",
        variant: "destructive",
      });
    }
  }, [previousError, showPrevious, toast]);

  const raceData: RaceData | undefined = showPrevious ? previousRaceData : currentRaceData;
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
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeft(`${days}d ${hours}h ${minutes}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [currentRaceData?.endDate]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      timeZone: "UTC",
    });
  };

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

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-4 right-4 z-50 w-80"
      >
        <div className="bg-[#1A1B21]/90 backdrop-blur-sm border border-[#2A2B31] rounded-lg p-4">
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-[#D7FF00] border-t-transparent rounded-full" />
            <span className="text-[#8A8B91]">Loading race data...</span>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!raceData) return null;

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 right-4 z-50 w-80"
    >
      <div className="relative">
        {onClose && (
        <button 
          onClick={onClose}
          className="absolute -top-2 -right-2 z-20 bg-[#1A1B21] border border-[#2A2B31] rounded-full p-1.5 text-[#8A8B91] hover:text-white hover:bg-[#2A2B31] transition-colors"
        >
          <X size={14} />
        </button>
      )}
      <div className="bg-[#1A1B21]/90 backdrop-blur-sm border border-[#2A2B31] rounded-lg shadow-lg overflow-hidden">
          <div
            className="p-4 cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-[#D7FF00]" />
                <span className="font-heading text-white">
                  {raceData.title ||
                    (showPrevious ? "Previous Race" : "Monthly Race")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsVisible(false);
                  }}
                  className="text-[#8A8B91] hover:text-white p-1"
                >
                  <X size={14} />
                </button>
                {!showPrevious && (
                  <>
                    <Clock className="h-4 w-4 text-[#D7FF00]" />
                    <span className="text-white font-mono">{timeLeft}</span>
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
                  {raceData.participants.map((participant: RaceParticipant, index: number) => (
                    <div
                      key={participant.uid}
                      className="flex items-center justify-between py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`
                            w-5 h-5 flex items-center justify-center rounded-full text-sm font-medium
                            ${index === 0 ? "bg-yellow-500 text-black" : ""}
                            ${index === 1 ? "bg-gray-400 text-black" : ""}
                            ${index === 2 ? "bg-amber-700 text-white" : ""}
                            ${index > 2 ? "bg-[#2A2B31] text-white" : ""}
                          `}
                        >
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
      </div>
    </motion.div>
  );
}
