
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Gem } from "lucide-react";

interface LoadingSpinnerProps {
  fullscreen?: boolean;
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({ fullscreen = true, size = "md" }: LoadingSpinnerProps) {
  const sizeClasses = useMemo(
    () => ({
      sm: "h-8 w-8",
      md: "h-12 w-12",
      lg: "h-16 w-16",
    }),
    []
  );

  const containerVariants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.2, ease: "easeOut" }
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      transition: { duration: 0.2 }
    }
  };

  const gemVariants = {
    animate: {
      rotate: 360,
      scale: [1, 1.1, 1],
      transition: {
        rotate: { duration: 1.5, repeat: Infinity, ease: "linear" },
        scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
      },
    },
  };

  const Content = () => (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col items-center gap-3"
    >
      <motion.div
        variants={gemVariants}
        animate="animate"
        className="relative"
        style={{ willChange: "transform" }}
      >
        <Gem className={`${sizeClasses[size]} text-[#D7FF00]`} />
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 blur-lg bg-[#D7FF00]/30 rounded-full"
          style={{ willChange: "opacity" }}
        />
      </motion.div>
    </motion.div>
  );

  if (fullscreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-[4px] z-50 flex items-center justify-center"
      >
        <Content />
      </motion.div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4">
      <Content />
    </div>
  );
}
