import React from "react";
import { motion } from "framer-motion";

interface RankProgressDisplayProps {
  currentRank: string;
  nextRank: string;
  currentXP: number;
  requiredXP: number;
  emblemSrc?: string;
}

export function RankProgressDisplay({
  currentRank,
  nextRank,
  currentXP,
  requiredXP,
  emblemSrc,
}: RankProgressDisplayProps) {
  // Calculate progress percentage
  const progressPercentage = Math.min(100, (currentXP / requiredXP) * 100);
  
  return (
    <div className="bg-[#1A1B21]/80 backdrop-blur-md border border-[#2A2B31] rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            {emblemSrc ? (
              <img 
                src={emblemSrc} 
                alt={`${currentRank} Rank`} 
                className="w-16 h-16 object-contain"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#2A2B31] flex items-center justify-center">
                <span className="text-[#D7FF00] text-xl font-bold">{currentRank.charAt(0)}</span>
              </div>
            )}
            <div className="absolute -top-2 -right-2 bg-[#D7FF00] text-black text-xs font-bold px-2 py-0.5 rounded-full">
              RANK
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">{currentRank}</h3>
            <p className="text-[#8A8B91] text-sm">Current Rank</p>
          </div>
        </div>
        
        <div className="text-right">
          <h4 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Next Rank:</span>
            <span className="text-[#D7FF00]">{nextRank}</span>
          </h4>
          <p className="text-[#8A8B91] text-sm">
            {currentXP.toLocaleString()}/{requiredXP.toLocaleString()} XP
          </p>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="h-4 bg-[#2A2B31] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-[#D7FF00]"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
      
      <div className="mt-2 flex justify-between text-sm">
        <span className="text-[#8A8B91]">{progressPercentage.toFixed(1)}% Complete</span>
        <span className="text-[#D7FF00]">
          {(requiredXP - currentXP).toLocaleString()} XP to {nextRank}
        </span>
      </div>
    </div>
  );
}
