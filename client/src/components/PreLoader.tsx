import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface PreLoaderProps {
  onLoadComplete: () => void;
}

export const PreLoader: React.FC<PreLoaderProps> = ({ onLoadComplete }) => {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [loadingText, setLoadingText] = useState("Loading");

  // Simulate loading progress
  useEffect(() => {
    const startTime = Date.now();
    const minDuration = 2000; // Minimum loading time in ms
    const interval = 30; // Update interval in ms

    // Calculate progress increment per interval to complete in minDuration
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

  // Trigger onLoadComplete when loading is finished
  useEffect(() => {
    if (isComplete) {
      // Delay completion to ensure animations finish
      const completeTimer = setTimeout(() => {
        onLoadComplete();
      }, 800);
      return () => clearTimeout(completeTimer);
    }
  }, [isComplete, onLoadComplete]);

  // Animation for loading text
  useEffect(() => {
    const textTimer = setInterval(() => {
      setLoadingText(prev => {
        if (prev === "Loading...") return "Loading";
        return prev + ".";
      });
    }, 500);

    return () => clearInterval(textTimer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 flex flex-col items-center justify-center bg-black z-50"
    >
      <div className="relative w-48 h-48 mb-8">
        <motion.img 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          src="/images/Goated Logo - Yellow.png" 
          alt="Goated Logo" 
          className="w-full h-full"
        />

        {/* Add subtle pulse animation around the logo */}
        <motion.div
          animate={{ 
            scale: [1, 1.05, 1],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
          className="absolute inset-0 rounded-full bg-[#D7FF00]/20 -z-10"
        />
      </div>

      {/* Progress bar container */}
      <div className="w-64 h-2 bg-[#1A1B21] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-[#D7FF00]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: "easeInOut" }}
        />
      </div>

      <div className="mt-4 text-[#8A8B91] text-sm font-mono">
        {loadingText}
      </div>
    </motion.div>
  );
};