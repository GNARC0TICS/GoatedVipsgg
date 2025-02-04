
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { PreLoader } from "./PreLoader";
import { useState } from "react";

interface PageTransitionProps {
  children: ReactNode;
  isLoading?: boolean;
}

export function PageTransition({ children, isLoading = false }: PageTransitionProps) {
  const [showContent, setShowContent] = useState(!isLoading);

  if (isLoading) {
    return <PreLoader onLoadComplete={() => setShowContent(true)} />;
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
