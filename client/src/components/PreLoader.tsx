
import { motion } from "framer-motion";
import { useEffect } from "react";

interface PreLoaderProps {
  onLoadComplete: () => void;
}

export function PreLoader({ onLoadComplete }: PreLoaderProps) {
  useEffect(() => {
    // Reduced delay to 1.5s for better UX
    const timer = setTimeout(() => {
      onLoadComplete();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onLoadComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed inset-0 bg-[#14151A] z-50 flex flex-col items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-8"
      >
        <motion.img
          src="/images/preload.PNG"
          alt="Goated Preloader"
          className="w-64 h-64 object-contain"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 1.5, repeat: 1, ease: "easeInOut" }}
        />

        <div className="w-64 h-1 bg-[#2A2B31] rounded-full overflow-hidden">
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ 
              duration: 1.5,
              ease: "easeInOut",
              repeat: 0
            }}
            className="h-full w-full bg-[#D7FF00]"
            style={{ willChange: "transform" }}
          />
        </div>

        <motion.p 
          className="text-[#D7FF00] font-heading text-xl"
          animate={{ opacity: [1, 0.7, 1] }}
          transition={{ duration: 1, repeat: 1, ease: "easeInOut" }}
        >
          Loading...
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
