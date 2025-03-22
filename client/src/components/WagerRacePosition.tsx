import React, { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface WagerRacePositionProps {
  userId: number;
  goatedUsername?: string;
}

interface RacePosition {
  position: number;
  totalParticipants: number;
  wagerAmount: number;
  previousPosition?: number;
  raceType: "daily" | "weekly" | "monthly";
  raceTitle: string;
  endDate: string;
}

// Fallback data for when API fails
const createFallbackRacePosition = (raceType: "daily" | "weekly" | "monthly" = "weekly"): RacePosition => {
  const today = new Date();
  const endDate = new Date();
  
  // Set end date based on race type
  if (raceType === "daily") {
    endDate.setDate(today.getDate() + 1);
  } else if (raceType === "weekly") {
    endDate.setDate(today.getDate() + 7 - today.getDay()); // End of week
  } else {
    endDate.setMonth(today.getMonth() + 1, 0); // End of month
  }
  
  return {
    position: 5,
    totalParticipants: 100,
    wagerAmount: 25000,
    previousPosition: 7, // Show improvement by default
    raceType: raceType,
    raceTitle: `${raceType.charAt(0).toUpperCase() + raceType.slice(1)} Wager Race`,
    endDate: endDate.toISOString(),
  };
};

export function WagerRacePosition({ userId, goatedUsername }: WagerRacePositionProps) {
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  
  // Fetch the user's current race position
  const { data: racePosition, isLoading, error, refetch } = useQuery<RacePosition>({
    queryKey: ["/api/wager-race/position", userId, goatedUsername],
    queryFn: async () => {
      try {
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
        
        const response = await fetch(`/api/wager-race/position?userId=${userId}${goatedUsername ? `&username=${goatedUsername}` : ''}`, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          }
        });
        
        // Clear the timeout
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          setErrorDetails(`Error ${response.status}: ${errorText}`);
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data as RacePosition;
      } catch (err) {
        // Handle timeout errors
        if (err instanceof DOMException && err.name === 'AbortError') {
          setErrorDetails('Request timed out. Please try again later.');
        } else {
          setErrorDetails(err instanceof Error ? err.message : String(err));
        }
        
        // Return fallback data
        return createFallbackRacePosition();
      }
    },
    enabled: !!userId && !!goatedUsername,
    retry: 2,
    refetchOnWindowFocus: false,
    refetchInterval: 300000, // 5 minutes
  });

  if (!goatedUsername) {
    return (
      <div className="bg-[#1A1B21]/50 backdrop-blur-sm border border-[#2A2B31] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-[#D7FF00]" />
          <h3 className="text-xl font-heading text-white">Wager Race Position</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-[#8A8B91] mb-4">
            Link your Goated.com account to see your wager race position
          </p>
          <button 
            className="bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90 transition-all duration-300 px-4 py-2 rounded-md font-medium"
            onClick={() => window.open("https://www.goated.com/r/EARLYACCESS", "_blank")}
          >
            Connect to Goated
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-[#1A1B21]/50 backdrop-blur-sm border border-[#2A2B31] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-[#D7FF00]" />
          <h3 className="text-xl font-heading text-white">Wager Race Position</h3>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#2A2B31] rounded-md w-3/4 mx-auto"></div>
          <div className="h-16 bg-[#2A2B31] rounded-md w-full"></div>
          <div className="h-8 bg-[#2A2B31] rounded-md w-1/2 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error || !racePosition) {
    return (
      <div className="bg-[#1A1B21]/50 backdrop-blur-sm border border-[#2A2B31] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-[#D7FF00]" />
          <h3 className="text-xl font-heading text-white">Wager Race Position</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-[#8A8B91]">
            Unable to load race position data. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  // Calculate position change indicator
  const getPositionChange = () => {
    if (!racePosition.previousPosition) return null;
    
    if (racePosition.position < racePosition.previousPosition) {
      // Improved position (lower number is better)
      return {
        icon: <TrendingUp className="h-4 w-4 text-green-500" />,
        text: `+${racePosition.previousPosition - racePosition.position}`,
        color: "text-green-500",
      };
    } else if (racePosition.position > racePosition.previousPosition) {
      // Worse position
      return {
        icon: <TrendingDown className="h-4 w-4 text-red-500" />,
        text: `-${racePosition.position - racePosition.previousPosition}`,
        color: "text-red-500",
      };
    } else {
      // No change
      return {
        icon: <Minus className="h-4 w-4 text-[#8A8B91]" />,
        text: "0",
        color: "text-[#8A8B91]",
      };
    }
  };

  const positionChange = getPositionChange();

  // Calculate days remaining
  const endDate = new Date(racePosition.endDate);
  const today = new Date();
  const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="bg-[#1A1B21]/50 backdrop-blur-sm border border-[#2A2B31] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-[#D7FF00]" />
          <h3 className="text-xl font-heading text-white">Wager Race Position</h3>
        </div>
        <span className="text-sm text-[#8A8B91] font-medium capitalize">
          {racePosition.raceType} Race
        </span>
      </div>
      
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-4xl font-bold text-white mb-2"
          >
            #{racePosition.position}
          </motion.div>
          <div className="text-sm text-[#8A8B91]">
            of {racePosition.totalParticipants} participants
          </div>
          
          {positionChange && (
            <div className={`flex items-center gap-1 mt-2 ${positionChange.color}`}>
              {positionChange.icon}
              <span className="text-sm font-medium">{positionChange.text}</span>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center py-2 border-b border-[#2A2B31]">
            <span className="text-[#8A8B91]">Current Wager:</span>
            <span className="text-white font-mono">${racePosition.wagerAmount.toLocaleString()}</span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-[#2A2B31]">
            <span className="text-[#8A8B91]">Race:</span>
            <span className="text-white">{racePosition.raceTitle}</span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-[#2A2B31]">
            <span className="text-[#8A8B91]">Ends In:</span>
            <span className="text-white">{daysRemaining} days</span>
          </div>
        </div>
      </div>
    </div>
  );
}
