
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { LoadingSpinner } from "./LoadingSpinner";

interface PageTransitionProps {
  children: ReactNode;
  isLoading?: boolean;
}

export function PageTransition({ children, isLoading = false }: PageTransitionProps) {
  if (isLoading) {
    return <LoadingSpinner />;
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
