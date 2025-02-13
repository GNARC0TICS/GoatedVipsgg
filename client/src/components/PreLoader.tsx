import { motion } from "framer-motion";
import { useEffect } from "react";

interface PreLoaderProps {
  onLoadComplete: () => void;
}

export function PreLoader({ onLoadComplete }: PreLoaderProps) {
  useEffect(() => {
    // Fixed duration for preloader display: 2.5 seconds total
    const timer = setTimeout(() => {
      onLoadComplete();
    }, 2500);
    return () => clearTimeout(timer);
  }, [onLoadComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 bg-[#14151A] z-50 flex flex-col items-center justify-center"
      style={{ willChange: "opacity" }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col items-center gap-8"
      >
        <motion.img
          src="/images/preload.PNG"
          alt="Goated Preloader"
          className="w-64 h-64 object-contain"
          animate={{ scale: [1, 1.02, 1], opacity: [0.9, 1, 0.9] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="w-64 h-1 bg-[#2A2B31] rounded-full overflow-hidden">
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: ["0%", "100%"] }}
            transition={{ duration: 1, ease: "linear", repeat: Infinity }}
            className="h-full w-32 bg-gradient-to-r from-transparent via-[#D7FF00] to-transparent"
            style={{ willChange: "transform" }}
          />
        </div>

        <motion.p 
          className="text-[#D7FF00] font-heading text-xl"
          animate={{ opacity: [1, 0.7, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          Loading...
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
