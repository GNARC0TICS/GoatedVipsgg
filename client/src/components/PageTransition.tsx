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

  // Show loader with improved timing to avoid flickering but guarantee visibility for user feedback
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (isLoading) {
      setIsCompleted(false);
      setShouldRenderContent(false);
      
      // Show loader after a small delay to avoid flickering for very fast loads
      timeout = setTimeout(() => setShowLoading(true), 200);
      
      // Force completion after a reasonable maximum time
      const forceCompleteTimeout = setTimeout(() => {
        handleLoadComplete();
      }, 8000); // Force completion after 8 seconds max
      
      return () => {
        clearTimeout(timeout);
        clearTimeout(forceCompleteTimeout);
      };
    } else if (!isCompleted) {
      if (showLoading) {
        // If we were showing the loader, wait for the complete animation
        // This ensures we don't cut off animations in the middle
        // The handling of this case is done in handleLoadComplete
      } else {
        // If loading is done but we weren't showing the loader, render content immediately
        setShouldRenderContent(true);
        
        // Scroll to top when new content loads
        window.scrollTo({ top: 0, behavior: "instant" });
        
        timeout = setTimeout(() => {
          setShowLoading(false);
          setIsCompleted(false);
        }, 500);
      }
    }
    
    return () => clearTimeout(timeout);
  }, [isLoading, isCompleted, showLoading]);

  // Handle loading completion with guaranteed visual feedback
  const handleLoadComplete = () => {
    setIsCompleted(true);
    
    // Ensure we show at least a brief completion state before transitioning
    // This guarantees users see the loading reach 100% for better perceived performance
    setTimeout(() => {
      setShowLoading(false);
      setShouldRenderContent(true);
      
      // Scroll to top when completed
      window.scrollTo({ top: 0, behavior: "instant" });
    }, 800); // Increased from 600ms to ensure smoother transition and visibility of completed state
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