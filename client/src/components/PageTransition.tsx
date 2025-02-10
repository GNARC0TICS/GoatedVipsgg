
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { PreLoader } from "./PreLoader";
import { useState } from "react";

interface PageTransitionProps {
  children: ReactNode;
  isLoading?: boolean;
}

export function PageTransition({ children, isLoading = false }: PageTransitionProps) {
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoading(true), 300); // Only show loader after 300ms
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  if (isLoading && showLoading) {
    return <PreLoader onLoadComplete={() => setShowLoading(false)} />;
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
