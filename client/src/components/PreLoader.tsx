import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface PreLoaderProps {
  onLoadComplete: () => void;
}

export function PreLoader({ onLoadComplete }: PreLoaderProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const minDisplayTime = 2000; // Minimum time to show loader (2 seconds)

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        // Accelerate progress as it gets closer to 100%
        const increment = Math.max(1, Math.floor((100 - prev) / 10));
        return Math.min(prev + increment, 100);
      });
    }, 50);

    // Handle completion with minimum display time
    const completionCheck = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      if (progress >= 100 && elapsedTime >= minDisplayTime) {
        clearInterval(completionCheck);
        clearInterval(progressInterval);
        setTimeout(() => {
          onLoadComplete();
        }, 500); // Smooth exit transition
      }
    }, 100);

    return () => {
      clearInterval(progressInterval);
      clearInterval(completionCheck);
    };
  }, [onLoadComplete, progress]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 bg-[#14151A] z-50 flex flex-col items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col items-center gap-8"
      >
        <motion.img
          src="/images/preload.PNG"
          alt="Goated Preloader"
          className="w-64 h-64 object-contain"
          animate={{
            scale: [1, 1.02, 1],
            opacity: [0.9, 1, 0.9],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <div className="w-64 h-1 bg-[#2A2B31] rounded-full overflow-hidden">
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: progress / 100 }}
            transition={{ 
              type: "spring",
              damping: 20,
              stiffness: 100
            }}
            className="h-full bg-[#D7FF00] origin-left"
            style={{ willChange: "transform" }}
          />
        </div>

        <motion.p 
          className="text-[#D7FF00] font-heading text-xl"
          animate={{
            opacity: [1, 0.7, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {progress}%
        </motion.p>
      </motion.div>
    </motion.div>
  );
}