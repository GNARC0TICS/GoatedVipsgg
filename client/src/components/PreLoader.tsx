import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface PreLoaderProps {
  onLoadComplete: () => void;
}

export function PreLoader({ onLoadComplete }: PreLoaderProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 2000; // 2 seconds total
    const interval = 20; // Update every 20ms for smoother animation
    const steps = duration / interval;
    const increment = 100 / steps;

    const timer = setInterval(() => {
      setProgress(prev => {
        const next = Math.min(prev + increment, 100);
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(onLoadComplete, 500);
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
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
          className="w-64 h-64 object-contain animate-pulse-subtle"
        />
        <div className="w-64 h-1 bg-[#2A2B31] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#D7FF00]"
            style={{ width: `${Math.floor(progress)}%` }}
          />
        </div>
        <p className="text-[#D7FF00] font-heading text-xl">
          {Math.floor(progress)}%
        </p>
      </motion.div>
    </motion.div>
  );
}