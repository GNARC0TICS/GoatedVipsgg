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
  const [shouldRenderContent, setShouldRenderContent] = useState(!isLoading);

  // Only show loader if loading takes more than 300ms to avoid flicker for fast loads
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (isLoading) {
      setIsCompleted(false);
      setShouldRenderContent(false);
      timeout = setTimeout(() => setShowLoading(true), 300);
    } else if (!isCompleted) {
      // If loading is done but we weren't showing the loader, render content immediately
      setShouldRenderContent(true);
      timeout = setTimeout(() => {
        setShowLoading(false);
        setIsCompleted(false);
      }, 500);
    }
    
    return () => clearTimeout(timeout);
  }, [isLoading, isCompleted]);

  // Handle loading completion
  const handleLoadComplete = () => {
    setIsCompleted(true);
    // Wait a moment before rendering content to allow for transition
    setTimeout(() => {
      setShowLoading(false);
      setShouldRenderContent(true);
    }, 600);
  };

  if (isLoading && showLoading && !isCompleted) {
    return <PreLoader onLoadComplete={handleLoadComplete} />;
  }

  // Only render content when we should
  if (!shouldRenderContent) {
    return null; // Return empty during transition
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