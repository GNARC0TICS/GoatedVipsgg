import * as React from "react";
import { motion } from "framer-motion";

interface PreLoaderProps {
  onLoadComplete?: () => void;
}

export function PreLoader({ onLoadComplete = () => {} }: PreLoaderProps) {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    // Start with a bit of delay to ensure animation starts properly
    const startDelay = setTimeout(() => {
      const timer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(timer);
            setTimeout(onLoadComplete, 500);
            return 100;
          }
          // Increase faster initially, then slower towards the end
          const increment = prev < 50 ? 2 : prev < 85 ? 1 : 0.5;
          return Math.min(100, prev + increment);
        });
      }, 30);
      
      return () => clearInterval(timer);
    }, 200);
    
    return () => clearTimeout(startDelay);
  }, [onLoadComplete]);

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
        transition={{ duration: 0.2 }}
        className="flex flex-col items-center gap-8"
      >
        <img
          src="/images/preload.PNG"
          alt="Goated Preloader"
          className="w-64 h-64 object-contain animate-pulse"
        />
        <div className="w-64 h-1 bg-[#2A2B31] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#D7FF00]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
        <p className="text-[#D7FF00] font-heading text-xl">
          {progress}%
        </p>
      </motion.div>
    </motion.div>
  );
}