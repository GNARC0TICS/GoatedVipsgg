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
      className="fixed inset-0 flex flex-col items-center justify-center bg-[#14151A] z-50"
      style={{ 
        willChange: "opacity, transform",
      }}
    >
      <div className="flex flex-col items-center">
        <img 
          src="/images/preload.PNG" 
          alt="Goated VIPs" 
          className="mb-8 w-64 h-auto object-contain"
        />
        <div className="w-64 h-2 bg-[#2A2B31] rounded-full overflow-hidden mb-4">
          <motion.div
            className="h-full bg-[#D7FF00]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: "easeInOut" }}
          />
        </div>
        <p className="text-[#8A8B91] font-mono">{loadingText}</p>
      </div>
    </motion.div>
  );
};