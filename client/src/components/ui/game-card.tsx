
import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GameCardProps {
  title: string;
  description: string;
  imageSrc: string;
  isNew?: boolean;
  providerName?: string;
  onClick?: () => void;
  className?: string;
}

export function GameCard({
  title,
  description,
  imageSrc,
  isNew = false,
  providerName,
  onClick,
  className,
}: GameCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className={cn(
        "relative group overflow-hidden rounded-xl border border-border hover:border-primary/50 transition-all duration-300 cursor-pointer",
        className
      )}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className="relative aspect-[4/3] w-full">
        <img
          src={imageSrc}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent opacity-80" />
        
        {/* New badge */}
        {isNew && (
          <div className="absolute top-2 right-2 bg-primary text-black text-xs font-bold px-2 py-1 rounded-full z-10">
            NEW
          </div>
        )}
        
        {/* Provider badge */}
        {providerName && (
          <div className="absolute top-2 left-2 bg-background-card/80 text-white text-xs px-2 py-1 rounded-full z-10 backdrop-blur-sm">
            {providerName}
          </div>
        )}
        
        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          <h3 className="text-white font-heading text-lg mb-1">{title}</h3>
          <p className="text-text-secondary text-sm line-clamp-2">{description}</p>
        </div>
      </div>
      
      {/* Play button that appears on hover */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
        initial={false}
        animate={{ opacity: isHovered ? 1 : 0 }}
      >
        <button className="bg-primary text-black font-heading px-6 py-2 rounded-full transform hover:scale-105 transition-transform">
          <span className="flex items-center gap-1">
            PLAY NOW
            <img 
              src="/images/Goated Logo - Black.png" 
              alt="Goated" 
              className="w-4 h-4 inline-block" 
            />
          </span>
        </button>
      </motion.div>
    </motion.div>
  );
}
