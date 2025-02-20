import React from 'react';
import { motion } from 'framer-motion';
import { Achievement } from '@/lib/achievements/types';
import { getRarityColor } from '@/lib/achievements/types';
import { Progress } from '@/components/ui/progress';

interface AchievementCardProps {
  achievement: Achievement;
  isUnlocked: boolean;
  progress?: number;
}

export const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement,
  isUnlocked,
  progress = 0
}) => {
  const rarityColor = getRarityColor(achievement.rarity);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative overflow-hidden rounded-lg border
        ${isUnlocked 
          ? 'bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]' 
          : 'bg-[#1A1B21]/20 border-[#2A2B31]/50'
        }
        p-4 transition-all duration-300 hover:scale-[1.02]
      `}
    >
      {/* Achievement Icon */}
      <div className="flex items-center gap-4 mb-3">
        <div 
          className={`
            w-12 h-12 rounded-full flex items-center justify-center
            ${isUnlocked ? 'bg-[#2A2B31]' : 'bg-[#2A2B31]/50'}
          `}
        >
          <span className="text-2xl">{achievement.icon}</span>
        </div>
        <div>
          <h3 
            className="font-bold"
            style={{ color: isUnlocked ? rarityColor : '#8A8B91' }}
          >
            {achievement.name}
          </h3>
          <p className="text-sm text-[#8A8B91]">{achievement.description}</p>
        </div>
      </div>

      {/* Progress Bar */}
      {!isUnlocked && progress > 0 && (
        <div className="mt-3">
          <Progress value={progress} className="h-1" />
          <p className="text-xs text-[#8A8B91] mt-1">
            Progress: {Math.round(progress)}%
          </p>
        </div>
      )}

      {/* Unlocked Status */}
      {isUnlocked && (
        <div className="absolute top-2 right-2">
          <span className="text-[#D7FF00]">✓</span>
        </div>
      )}

      {/* Rarity Badge */}
      <div 
        className="absolute bottom-2 right-2 text-xs px-2 py-1 rounded"
        style={{ 
          backgroundColor: `${rarityColor}20`,
          color: rarityColor 
        }}
      >
        {achievement.rarity}
      </div>
    </motion.div>
  );
}; 