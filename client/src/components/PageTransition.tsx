
import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { LoadingSpinner } from "./LoadingSpinner";
import { useLocation } from "wouter";

interface PageTransitionProps {
  children: ReactNode;
  isLoading?: boolean;
}

export function PageTransition({ children, isLoading = false }: PageTransitionProps) {
  const [showLoading, setShowLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      // Show loader after a brief delay to prevent flashing
      timeout = setTimeout(() => setShowLoading(true), 150);
    } else {
      setShowLoading(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  // Reset loading state on route change
  useEffect(() => {
    setShowLoading(false);
  }, [location]);

  if (!mounted) return null;

  return (
    <AnimatePresence mode="wait">
      {isLoading && showLoading ? (
        <motion.div
          key="loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 flex items-center justify-center bg-[#14151A]/80 backdrop-blur-sm z-50"
        >
          <LoadingSpinner size="lg" />
        </motion.div>
      ) : (
        <motion.div
          key={`content-${location}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{
            duration: 0.3,
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
