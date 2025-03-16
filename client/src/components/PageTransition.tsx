import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { PreLoader } from "./PreLoader";
import { useState, useEffect } from "react";

interface PageTransitionProps {
  children: ReactNode;
  isLoading?: boolean;
}

// Define the animation variants
const pageVariants = {
  initial: { 
    opacity: 0, 
    y: 10
  },
  animate: { 
    opacity: 1, 
    y: 0
  },
  exit: { 
    opacity: 0, 
    y: -10
  }
};

export function PageTransition({ children, isLoading = false }: PageTransitionProps) {
  const [showLoading, setShowLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [shouldRenderContent, setShouldRenderContent] = useState(!isLoading);

  // Only show loader if loading takes more than 250ms to avoid flicker for fast loads
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (isLoading) {
      setIsCompleted(false);
      
      // Keep a safety timeout to ensure content is shown even if loading never completes
      const safetyTimeout = setTimeout(() => {
        console.log("PageTransition: Safety timeout triggered");
        setShouldRenderContent(true);
        setShowLoading(false);
        setIsCompleted(true);
      }, 5000); // 5 seconds max loading time
      
      // Normal short timeout for showing loader
      timeout = setTimeout(() => setShowLoading(true), 250);
      
      return () => {
        clearTimeout(timeout);
        clearTimeout(safetyTimeout);
      };
    } else if (!isCompleted) {
      if (showLoading) {
        // If we were showing the loader, wait for the complete animation
        // This ensures we don't cut off animations in the middle
        // But also set a timeout to ensure content shows after a short delay
        timeout = setTimeout(() => {
          setShouldRenderContent(true);
          setShowLoading(false);
        }, 800);
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

  // Handle loading completion
  const handleLoadComplete = () => {
    setIsCompleted(true);
    // Wait a moment before rendering content to allow for transition
    setTimeout(() => {
      setShowLoading(false);
      setShouldRenderContent(true);
    }, 800); // Increased from 600ms to ensure smoother transition
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
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={{
        type: "tween",
        duration: 0.3,
        ease: "easeOut"
      }}
      style={{ 
        willChange: "opacity, transform",
        backfaceVisibility: "hidden"
      }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}
