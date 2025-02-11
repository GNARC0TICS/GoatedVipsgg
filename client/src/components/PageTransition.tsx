import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { PreLoader } from "./PreLoader";
import { useState, useEffect } from "react";
import { LoadingSpinner } from "./LoadingSpinner";

interface PageTransitionProps {
  children: ReactNode;
  isLoading?: boolean;
}

export function PageTransition({ children, isLoading = false }: PageTransitionProps) {
  const [showLoading, setShowLoading] = useState(false);
  const [transitionComplete, setTransitionComplete] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      // Show loading spinner after a brief delay to prevent flashing
      timeout = setTimeout(() => setShowLoading(true), 300);
    } else {
      setShowLoading(false);
      // Mark transition as complete after exit animation
      setTimeout(() => setTransitionComplete(true), 500);
    }
    return () => {
      clearTimeout(timeout);
    };
  }, [isLoading]);

  if (isLoading && showLoading) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
        duration: 0.3
      }}
      onAnimationComplete={() => setTransitionComplete(true)}
      style={{ 
        willChange: "opacity, transform",
        backfaceVisibility: "hidden",
        isolation: "isolate",
        transform: "translateZ(0)",
        perspective: 1000
      }}
    >
      {children}
    </motion.div>
  );
}