import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface MainPreloaderProps {
  /**
   * Callback function to execute when loading is complete
   */
  onLoadComplete?: () => void;
  
  /**
   * Whether to use a random progress bar or a manually controlled one
   * @default false
   */
  useRandomProgressBar?: boolean;
  
  /**
   * Progress value (0-100) if not using random progress
   * @default 0
   */
  progress?: number;
}

/**
 * MainPreloader
 * 
 * Enhanced full-screen loading component with logo and animated progress bar
 * Used for initial app loading and heavy data-loading operations
 */
export function MainPreloader({ 
  onLoadComplete, 
  useRandomProgressBar = false,
  progress: externalProgress = 0
}: MainPreloaderProps) {
  const [progress, setProgress] = useState(externalProgress);
  
  useEffect(() => {
    if (!useRandomProgressBar) {
      setProgress(externalProgress);
      return;
    }
    
    // Random progress simulation for better UX
    let currentProgress = 0;
    const interval = setInterval(() => {
      // Slow down as we approach 100%
      const increment = currentProgress < 70 
        ? Math.random() * 10 
        : Math.random() * 3;
        
      currentProgress = Math.min(currentProgress + increment, 95);
      setProgress(currentProgress);
      
      // Once we hit 95%, we wait for actual completion signal
    }, 200);
    
    return () => clearInterval(interval);
  }, [useRandomProgressBar, externalProgress]);
  
  // When onLoadComplete is called, quickly complete the progress
  useEffect(() => {
    if (!onLoadComplete) return;
    
    const completeLoading = () => {
      setProgress(100);
      const timeout = setTimeout(() => {
        onLoadComplete();
      }, 400); // Short delay to show the completed progress
      
      return () => clearTimeout(timeout);
    };
    
    if (progress >= 95) {
      completeLoading();
    }
    
    return () => {};
  }, [progress, onLoadComplete]);
  
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
          transition={{ type: "spring", damping: 25, stiffness: 120 }}
        />
      </div>
      
      {/* Loading text */}
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-4 text-sm font-medium text-gray-400"
      >
        Loading Goated Experience...
      </motion.p>
    </motion.div>
  );
}