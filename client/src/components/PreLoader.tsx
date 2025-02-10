import { motion } from "framer-motion";
import { useEffect } from "react";

interface PreLoaderProps {
  onLoadComplete: () => void;
}

export function PreLoader({ onLoadComplete }: PreLoaderProps) {
  useEffect(() => {
    const timer = setTimeout(onLoadComplete, 2000);
    return () => clearTimeout(timer);
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
        <motion.div className="w-64 h-1 bg-[#2A2B31] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#D7FF00]"
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ 
              duration: 2,
              ease: "linear"
            }}
          />
        </motion.div>
        <motion.p 
          className="text-[#D7FF00] font-heading text-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Loading...
        </motion.p>
      </motion.div>
    </motion.div>
  );
}