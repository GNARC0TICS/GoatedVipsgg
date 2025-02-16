
import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { LoadingSpinner } from "./LoadingSpinner";

interface PageTransitionProps {
  children: ReactNode;
  isLoading?: boolean;
}

export function PageTransition({ children, isLoading = false }: PageTransitionProps) {
  const [showLoading, setShowLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoading(true), 150);
    } else {
      setShowLoading(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  if (!mounted) return null;

  return (
    <AnimatePresence mode="wait">
      {isLoading && showLoading ? (
        <motion.div
          key="loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center bg-[#14151A]/80 backdrop-blur-sm z-50"
        >
          <LoadingSpinner size="lg" />
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 0.2,
            ease: "easeInOut"
          }}
          className="min-h-screen w-full"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
