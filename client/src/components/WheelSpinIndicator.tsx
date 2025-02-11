import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Gift, Timer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";

export function WheelSpinIndicator() {
  const [, setLocation] = useLocation();
  const [timeLeft, setTimeLeft] = useState<string>("Available now!");
  const [isHovered, setIsHovered] = useState(false);

  const isAvailable = true; // For testing purposes

  return (
    <motion.div 
      className="fixed bottom-72 right-4 z-50 cursor-pointer"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", duration: 0.8 }}
      onClick={() => setLocation("/wheel-challenge")}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <motion.div
        animate={{
          scale: isHovered ? 1.05 : 1,
          y: isHovered ? -2 : 0
        }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <Card className={`px-4 py-3 flex items-center gap-3 border border-[#2A2B31] ${
          isAvailable ? 'bg-[#1A1B21] hover:border-[#D7FF00]' : 'bg-[#1A1B21]/50'
        }`}>
          <div className="relative">
            <Gift className={`h-5 w-5 ${isAvailable ? 'text-[#D7FF00]' : 'text-[#8A8B91]'}`} />
            {isAvailable && (
              <motion.span 
                className="absolute -top-1 -right-1 h-2 w-2 bg-[#D7FF00] rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>
          <div className="flex flex-col">
            <motion.span 
              className={`text-sm font-bold ${isAvailable ? 'text-[#D7FF00]' : 'text-[#8A8B91]'}`}
              animate={{ y: isHovered ? -2 : 0 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              Daily Wheel Spin
            </motion.span>
            <motion.div 
              className="flex items-center gap-1 text-xs text-[#8A8B91]"
              animate={{ y: isHovered ? -2 : 0 }}
              transition={{ type: "spring", stiffness: 400, delay: 0.05 }}
            >
              <Timer className="h-3 w-3" />
              <span>{timeLeft}</span>
            </motion.div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}