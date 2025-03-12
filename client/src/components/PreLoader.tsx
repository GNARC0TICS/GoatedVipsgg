
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface PreLoaderProps {
  onLoadComplete: () => void;
}

export function PreLoader({ onLoadComplete }: PreLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("Loading");
  const [forceComplete, setForceComplete] = useState(false);

  // Create more realistic loading simulation with guaranteed completion
  useEffect(() => {
    let timer: NodeJS.Timeout;
    let completionTimer: NodeJS.Timeout;
    
    // Initial quick progress to 30%
    const initialProgress = () => {
      let currentProgress = 0;
      timer = setInterval(() => {
        currentProgress += 2;
        if (currentProgress >= 30) {
          clearInterval(timer);
          // Then slower progress to simulate actual loading
          midProgress();
        }
        setProgress(currentProgress);
      }, 25);
    };

    // Middle phase (30-80%) with variable speed to simulate real loading
    const midProgress = () => {
      timer = setInterval(() => {
        setProgress(prev => {
          const increment = Math.random() * 1.5 + 0.5; // Random increment between 0.5 and 2
          const newProgress = prev + increment;
          
          if (newProgress >= 80) {
            clearInterval(timer);
            // Final phase - delay before completing
            setTimeout(finalProgress, 800);
            return 80;
          }
          return newProgress;
        });
      }, 100);
    };

    // Final phase (80-100%) with slower, more deliberate progress
    const finalProgress = () => {
      timer = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + 0.5;
          if (newProgress >= 100) {
            clearInterval(timer);
            setTimeout(() => {
              onLoadComplete();
            }, 600);
            return 100;
          }
          return newProgress;
        });
      }, 50);
    };

    initialProgress();

    // Ensure completion after a maximum time (8 seconds) regardless of progress
    completionTimer = setTimeout(() => {
      setForceComplete(true);
      setProgress(100);
      clearInterval(timer);
      setTimeout(() => {
        onLoadComplete();
      }, 600);
    }, 8000);

    return () => {
      clearInterval(timer);
      clearTimeout(completionTimer);
    };
  }, [onLoadComplete]);

  // Force completion if needed
  useEffect(() => {
    if (forceComplete) {
      setProgress(100);
    }
  }, [forceComplete]);

  // Animate the loading text dots
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
      className="fixed inset-0 bg-[#14151A] z-50 flex flex-col items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-8"
      >
        <motion.img
          src="/images/preload.PNG"
          alt="Goated Preloader"
          className="w-64 h-64 object-contain"
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.9, 1, 0.9]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <div className="w-64 h-2 bg-[#2A2B31] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#D7FF00]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ 
              duration: 0.3,
              ease: "easeOut"
            }}
          />
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-[#D7FF00] font-heading text-xl">
            {Math.round(progress)}%
          </p>
          <p className="text-[#8A8B91] text-sm font-medium">
            {loadingText}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
