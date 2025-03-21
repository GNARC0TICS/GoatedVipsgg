import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getTierFromWager, getTierIcon, tierThresholds, type TierLevel } from "@/lib/tier-utils";

interface RankProgressDisplayProps {
  wagerAmount: number;
  compact?: boolean;
  animate?: boolean;
}

export function RankProgressDisplay({
  wagerAmount,
  compact = false,
  animate = true,
}: RankProgressDisplayProps) {
  const [progress, setProgress] = useState(0);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  
  // Get current tier and next tier
  const currentTier = getTierFromWager(wagerAmount);
  
  // Find the next tier
  const tiers = Object.entries(tierThresholds) as [TierLevel, number][];
  const sortedTiers = tiers.sort((a, b) => a[1] - b[1]);
  
  const currentTierIndex = sortedTiers.findIndex(([tier]) => tier === currentTier);
  const nextTier = currentTierIndex < sortedTiers.length - 1 
    ? sortedTiers[currentTierIndex + 1][0] 
    : currentTier;
  
  // Calculate progress percentage
  useEffect(() => {
    if (currentTier === nextTier) {
      // Max tier reached
      setProgress(100);
    } else {
      const currentThreshold = tierThresholds[currentTier];
      const nextThreshold = tierThresholds[nextTier];
      const progressValue = ((wagerAmount - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
      setProgress(Math.min(Math.max(progressValue, 0), 100));
    }
  }, [wagerAmount, currentTier, nextTier]);
  
  // Animate progress
  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => {
        setAnimatedProgress(progress);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setAnimatedProgress(progress);
    }
  }, [progress, animate]);
  
  // Calculate XP needed for next level
  const currentThreshold = tierThresholds[currentTier];
  const nextThreshold = tierThresholds[nextTier];
  const xpNeeded = nextThreshold - wagerAmount;
  
  // For the circular progress indicator
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedProgress / 100) * circumference;
  
  if (compact) {
    // Compact version for mobile header
    return (
      <div className="relative flex items-center justify-center group">
        <svg width="50" height="50" viewBox="0 0 100 100" className="transform -rotate-90 filter drop-shadow-lg">
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="progressGradientCompact" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#D7FF00" />
              <stop offset="100%" stopColor="#A5FF00" />
            </linearGradient>
          </defs>
          
          {/* Background circle with subtle glow */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="#2A2B31"
            strokeWidth="8"
            className="filter drop-shadow-md"
          />
          
          {/* Progress circle with gradient */}
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="url(#progressGradientCompact)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animate ? circumference : strokeDashoffset}
            initial={animate ? { strokeDashoffset: circumference } : undefined}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: [0.34, 1.56, 0.64, 1] }}
            className="filter drop-shadow-md"
          />
        </svg>
        
        {/* Center icon with hover effect */}
        <motion.div 
          className="absolute inset-0 flex items-center justify-center"
          whileHover={{ scale: 1.1 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <motion.img 
            src={getTierIcon(currentTier)} 
            alt={currentTier} 
            className="w-6 h-6 drop-shadow-lg"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          />
        </motion.div>
        
        {/* Tooltip on hover */}
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[#1A1B21]/90 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
          {Math.round(progress)}% to {nextTier}
        </div>
      </div>
    );
  }
  
  return (
    <motion.div 
      className="bg-gradient-to-br from-[#1A1B21]/80 to-[#14151A]/90 backdrop-blur-md border border-[#2A2B31]/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-xl p-6 space-y-6 relative overflow-hidden group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[url('/images/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
      
      {/* Subtle hover effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-[#2A2B31]/0 via-[#D7FF00]/5 to-[#2A2B31]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-xl blur-sm" />
      
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-heading text-white tracking-wide">Rank Progress</h3>
        <motion.div 
          className="flex items-center gap-2 bg-[#2A2B31]/50 px-3 py-1.5 rounded-full"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <img 
            src={getTierIcon(currentTier)} 
            alt={currentTier} 
            className="w-6 h-6 drop-shadow-md"
          />
          <span className="text-[#D7FF00] font-medium tracking-wide">{currentTier}</span>
        </motion.div>
      </div>
      
      <div className="relative flex items-center justify-center py-6">
        <svg width="220" height="220" viewBox="0 0 100 100" className="transform -rotate-90 filter drop-shadow-lg">
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#D7FF00" />
              <stop offset="100%" stopColor="#A5FF00" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          
          {/* Background circle with subtle glow */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="#2A2B31"
            strokeWidth="8"
            className="filter drop-shadow-md"
          />
          
          {/* Progress circle with gradient and rounded caps */}
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="url(#progressGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animate ? circumference : strokeDashoffset}
            initial={animate ? { strokeDashoffset: circumference } : undefined}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: [0.34, 1.56, 0.64, 1] }}
            filter="url(#glow)"
          />
        </svg>
        
        <motion.div 
          className="absolute inset-0 flex flex-col items-center justify-center text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <motion.img 
            src={getTierIcon(currentTier)} 
            alt={currentTier} 
            className="w-14 h-14 mb-3 drop-shadow-lg"
            whileHover={{ 
              scale: 1.1,
              rotate: [0, -5, 5, -5, 0],
              transition: { duration: 0.5 }
            }}
          />
          <motion.div
            className="text-2xl font-bold text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            {Math.round(animatedProgress)}%
          </motion.div>
        </motion.div>
      </div>
      
      <div className="space-y-3 bg-[#1A1B21]/50 rounded-lg p-4 border border-[#2A2B31]/50">
        <motion.div 
          className="flex justify-between items-center"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.9, duration: 0.3 }}
        >
          <span className="text-[#8A8B91]">Current Rank:</span>
          <span className="text-white font-medium">{currentTier}</span>
        </motion.div>
        
        <motion.div 
          className="flex justify-between items-center"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.0, duration: 0.3 }}
        >
          <span className="text-[#8A8B91]">Next Rank:</span>
          <div className="flex items-center gap-2 bg-[#2A2B31]/50 px-2 py-1 rounded-md">
            <img 
              src={getTierIcon(nextTier)} 
              alt={nextTier} 
              className="w-5 h-5"
            />
            <span className="text-white font-medium">{nextTier}</span>
          </div>
        </motion.div>
        
        <motion.div 
          className="flex justify-between items-center"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.1, duration: 0.3 }}
        >
          <span className="text-[#8A8B91]">XP Needed:</span>
          <span className="text-white font-mono bg-[#2A2B31]/50 px-2 py-1 rounded-md">${xpNeeded.toLocaleString()}</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
