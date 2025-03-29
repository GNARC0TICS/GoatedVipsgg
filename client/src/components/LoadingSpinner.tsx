import { motion } from "framer-motion";
import { Gem } from "lucide-react";
import { FC } from "react";
import { LoadingSpinnerProps } from "./types";

export const LoadingSpinner: FC<LoadingSpinnerProps> = ({ 
  size = 16, 
  fullscreen = false,
  label = true
}) => {
  // Create inline spinner component
  const SpinnerContent = () => (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col items-center"
    >
      <motion.div
        animate={{
          rotate: 360,
          scale: [1, 1.1, 1],
        }}
        transition={{
          rotate: { duration: 2, repeat: Infinity, ease: "linear" },
          scale: { duration: 1, repeat: Infinity, ease: "easeInOut" },
        }}
        className="relative mb-2"
      >
        <Gem className="text-[#D7FF00]" style={{ width: size, height: size }} />
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 blur-md bg-[#D7FF00]/30 rounded-full"
        />
      </motion.div>

      {label && (
        <>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl font-heading font-bold text-[#D7FF00] mb-2"
          >
            Loading
          </motion.h2>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 120 }}
            transition={{ duration: 1, repeat: Infinity }}
            className="h-0.5 bg-[#D7FF00]/50 rounded-full"
          />
        </>
      )}
    </motion.div>
  );

  // Return fullscreen version if requested
  if (fullscreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-[4px] z-50 flex flex-col items-center justify-center"
        style={{ willChange: "opacity" }}
      >
        <SpinnerContent />
      </motion.div>
    );
  }

  // Return inline version by default
  return (
    <div className="flex justify-center items-center">
      <SpinnerContent />
    </div>
  );
};
