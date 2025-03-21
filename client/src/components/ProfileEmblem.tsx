import React, { useMemo } from "react";
import { motion } from "framer-motion";

interface ProfileEmblemProps {
  username: string;
  color?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  animate?: boolean;
}

export function ProfileEmblem({
  username,
  color = "#D7FF00",
  size = "md",
  className = "",
  animate = true,
}: ProfileEmblemProps) {
  // Get the first letter of the username
  const initial = useMemo(() => {
    if (!username) return "?";
    return username.charAt(0).toUpperCase();
  }, [username]);

  // Determine size based on prop
  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-12 h-12 text-lg",
    lg: "w-16 h-16 text-2xl",
    xl: "w-24 h-24 text-4xl",
  };

  const sizeClass = sizeClasses[size];

  // Enhanced animation variants
  const variants = {
    initial: { scale: 0.8, opacity: 0, rotate: -10 },
    animate: { 
      scale: 1, 
      opacity: 1, 
      rotate: 0,
      transition: { 
        type: "spring", 
        stiffness: 300, 
        damping: 20,
        duration: 0.5 
      } 
    },
  };

  return (
    <div className="relative group">
      {/* Glow effect behind emblem */}
      <motion.div 
        className={`absolute inset-0 rounded-full blur-md opacity-0 group-hover:opacity-40 transition-opacity duration-700 ${sizeClass}`}
        style={{ backgroundColor: color }}
        layoutId={`emblem-glow-${username}`}
      />
      
      {/* Main emblem */}
      <motion.div
        className={`rounded-full flex items-center justify-center font-bold text-black ${sizeClass} ${className} relative overflow-hidden z-10`}
        style={{ backgroundColor: color }}
        initial={animate ? "initial" : undefined}
        animate={animate ? "animate" : undefined}
        variants={variants}
        whileHover={{ 
          scale: 1.05, 
          boxShadow: `0 0 15px ${color}80`,
          transition: { duration: 0.2 }
        }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 15 
        }}
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
        
        {/* Initial letter */}
        <span className="relative z-10 tracking-wide">{initial}</span>
        
        {/* Hover effect */}
        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors duration-300 rounded-full" />
      </motion.div>
    </div>
  );
}

// Component for editing the profile emblem
export function ProfileEmblemEditor({
  username,
  color,
  onColorChange,
}: {
  username: string;
  color: string;
  onColorChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6">
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <ProfileEmblem username={username} color={color} size="xl" />
      </motion.div>
      
      <motion.div 
        className="bg-[#1A1B21]/80 backdrop-blur-sm border border-[#2A2B31] rounded-xl p-3"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
      >
        <p className="text-[#8A8B91] text-xs mb-3 text-center">Choose your emblem color</p>
        <div className="flex flex-wrap gap-3 justify-center max-w-[280px]">
          {[
            "#D7FF00", // Neon Yellow (Brand color)
            "#FF5E5B", // Coral Red
            "#00A3FF", // Bright Blue
            "#FF00E5", // Magenta
            "#00FFA3", // Mint Green
            "#FFB800", // Amber
            "#9D4EDD", // Purple
            "#FF3D00", // Orange
            "#00FFFF", // Cyan
            "#FF00A0", // Pink
          ].map((colorOption, index) => (
            <motion.button
              key={colorOption}
              className={`w-9 h-9 rounded-full transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50 relative ${
                color === colorOption 
                  ? "ring-2 ring-white shadow-lg scale-110" 
                  : "hover:shadow-md"
              }`}
              style={{ backgroundColor: colorOption }}
              onClick={() => onColorChange(colorOption)}
              aria-label={`Select color ${colorOption}`}
              whileHover={{ 
                scale: 1.15,
                boxShadow: `0 0 12px ${colorOption}80`
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                duration: 0.3, 
                delay: 0.15 + (index * 0.03),
                type: "spring",
                stiffness: 300,
                damping: 20
              }}
            >
              {color === colorOption && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                >
                  <div className="bg-white/20 rounded-full p-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
