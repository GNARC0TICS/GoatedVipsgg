
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface PreLoaderProps {
  onLoadComplete: () => void;
}

export function PreLoader({ onLoadComplete }: PreLoaderProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onLoadComplete, 500); // Give a small delay before transition
          return 100;
        }
        return prev + 1;
      });
    }, 20);

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
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center gap-8"
      >
        <img
          src="/images/preload.PNG"
          alt="Goated Preloader"
          className="w-32 h-32 object-contain"
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
