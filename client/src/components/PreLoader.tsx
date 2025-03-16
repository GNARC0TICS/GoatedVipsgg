
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface PreLoaderProps {
  onLoadComplete: () => void;
}

export const PreLoader: React.FC<PreLoaderProps> = ({ onLoadComplete }) => {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const minDuration = 2000;
    const interval = 30;
    const incrementPerInterval = (100 * interval) / minDuration;

    const timer = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      const calculatedProgress = Math.min((elapsedTime / minDuration) * 100, 99.5);

      if (calculatedProgress >= 99.5) {
        clearInterval(timer);
        setProgress(100);
        setIsComplete(true);
      } else {
        setProgress(calculatedProgress);
      }
    }, interval);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isComplete) {
      const completeTimer = setTimeout(() => {
        onLoadComplete();
      }, 800);
      return () => clearTimeout(completeTimer);
    }
  }, [isComplete, onLoadComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex flex-col items-center justify-center bg-[#14151A] z-50"
    >
      <div className="flex flex-col items-center">
        <motion.div
          animate={{ 
            scale: [1, 1.05, 1],
          }}
          transition={{ 
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative mb-8"
        >
          <img 
            src="/images/preload.PNG" 
            alt="Goated VIPs" 
            className="w-64 h-auto object-contain"
          />
          <motion.div
            animate={{ 
              opacity: [0.2, 0.4, 0.2],
              scale: [0.95, 1.05, 0.95]
            }}
            transition={{ 
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 bg-[#D7FF00]/10 rounded-full -z-10 blur-lg"
          />
        </motion.div>
        <div className="w-64 h-2 bg-[#2A2B31] rounded-full overflow-hidden mb-4">
          <motion.div
            className="h-full bg-[#D7FF00]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: "easeInOut" }}
          />
        </div>
        <p className="text-[#8A8B91] font-mono">{Math.round(progress)}%</p>
      </div>
    </motion.div>
  );
};
