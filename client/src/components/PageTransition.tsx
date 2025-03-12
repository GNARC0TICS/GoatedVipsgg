import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { PreLoader } from "./PreLoader";
import { useState, useEffect } from "react";

interface PageTransitionProps {
  children: ReactNode;
  isLoading?: boolean;
}

export function PageTransition({ children, isLoading = false }: PageTransitionProps) {
  const [showLoading, setShowLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Only show loader if loading takes more than 300ms to avoid flicker for fast loads
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (isLoading) {
      setIsCompleted(false);
      timeout = setTimeout(() => setShowLoading(true), 300);
    } else {
      setShowLoading(false);
      // Reset completion state after transition
      timeout = setTimeout(() => setIsCompleted(false), 500);
    }
    
    return () => clearTimeout(timeout);
  }, [isLoading]);

  if (isLoading && showLoading && !isCompleted) {
    return <PreLoader onLoadComplete={() => setIsCompleted(true)} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{
        type: "tween",
        duration: 0.2,
        ease: "easeOut"
      }}
      style={{ 
        willChange: "opacity, transform",
        backfaceVisibility: "hidden"
      }}
    >
      {children}
    </motion.div>
  );
}