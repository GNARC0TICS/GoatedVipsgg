import React from "react";
import { motion } from "framer-motion";
import { Trophy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

interface WagerRacePositionProps {
  userId: number;
  goatedUsername?: string | null;
}

export function WagerRacePosition({ userId, goatedUsername }: WagerRacePositionProps) {
  // Fetch current race data
  const { data: raceData, isLoading } = useQuery({
    queryKey: ["wager-race-current"],
    queryFn: async () => {
      const response = await fetch("/api/wager-races/current");
      if (!response.ok) {
        throw new Error("Failed to fetch race data");
      }
      return response.json();
    },
    enabled: !!goatedUsername, // Only fetch if user has linked Goated account
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
  
  // Find user's position in the race
  const userPosition = raceData?.participants?.find(
    (p: any) => p.uid === userId || p.name === goatedUsername
  );
  
  const isParticipating = !!userPosition;
  
  return (
    <Card className="bg-[#1A1B21]/80 backdrop-blur-md border border-[#2A2B31] rounded-xl shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="h-6 w-6 text-[#D7FF00]" />
          <h3 className="text-xl font-bold text-white">Monthly Wager Race</h3>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#D7FF00]"></div>
          </div>
        ) : !goatedUsername ? (
          <div className="text-center py-6">
            <p className="text-[#8A8B91] mb-4">
              Link your Goated.com account to participate in monthly wager races and earn rewards!
            </p>
            <Button 
              className="bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90 transition-all duration-300 gap-2"
              onClick={() => window.open("https://www.goated.com/r/EARLYACCESS", "_blank")}
            >
              <span>Connect to Goated</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        ) : isParticipating ? (
          <div className="space-y-4">
            <div className="bg-[#2A2B31] rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[#8A8B91]">Your Position</span>
                <span className="text-2xl font-bold text-[#D7FF00]">#{userPosition.position}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8A8B91]">Total Wagered</span>
                <span className="text-white font-bold">${userPosition.wagered.toLocaleString()}</span>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-medium mb-2">Race Details</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-1 border-b border-[#2A2B31]">
                  <span className="text-[#8A8B91]">Prize Pool</span>
                  <span className="text-white">${raceData?.prizePool?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#2A2B31]">
                  <span className="text-[#8A8B91]">End Date</span>
                  <span className="text-white">
                    {raceData?.endDate ? new Date(raceData.endDate).toLocaleDateString() : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#2A2B31]">
                  <span className="text-[#8A8B91]">Status</span>
                  <span className="bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full text-xs">LIVE</span>
                </div>
              </div>
            </div>
            
            <Button 
              variant="outline"
              className="w-full border-[#D7FF00] text-[#D7FF00] hover:bg-[#D7FF00]/10"
              onClick={() => window.location.href = "/wager-races"}
            >
              View Full Leaderboard
            </Button>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-[#8A8B91] mb-4">
              You haven't wagered enough to appear on the leaderboard yet. Start playing to join the race!
            </p>
            <Button 
              className="bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90 transition-all duration-300 gap-2"
              onClick={() => window.open("https://www.goated.com/r/SPIN", "_blank")}
            >
              <span>Play Now</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
