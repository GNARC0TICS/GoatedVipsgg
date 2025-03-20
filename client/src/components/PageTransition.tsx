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
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -10,
  },
};

export function PageTransition({
  children,
  isLoading = false,
}: PageTransitionProps) {
  const [showLoading, setShowLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [shouldRenderContent, setShouldRenderContent] = useState(!isLoading);

  // Only show loader if loading takes more than 250ms to avoid flicker for fast loads
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let safetyTimeout: NodeJS.Timeout;
    let debugTimeout: NodeJS.Timeout;

    if (isLoading) {
      console.log('PageTransition: Loading started');
      setIsCompleted(false);
      setShouldRenderContent(false);
      timeout = setTimeout(() => setShowLoading(true), 250);
      
      // Add safety timeout to prevent infinite loading
      safetyTimeout = setTimeout(() => {
        if (!isCompleted && !shouldRenderContent) {
          console.warn('Loading timeout exceeded, forcing content render');
          setShowLoading(false);
          setShouldRenderContent(true);
        }
      }, 5000); // Reduced from 10s to 5s for better user experience
      
      // Add debug logging for long-running loads
      debugTimeout = setTimeout(() => {
        if (isLoading) {
          console.warn('PageTransition: Loading taking longer than expected');
        }
      }, 2000);
    } else if (!isCompleted) {
      console.log('PageTransition: Loading finished');
      if (showLoading) {
        // If we were showing the loader, wait for the complete animation
        // This ensures we don't cut off animations in the middle
        console.log('PageTransition: Waiting for animation completion');
      } else {
        // If loading is done but we weren't showing the loader, render content immediately
        console.log('PageTransition: Rendering content immediately');
        setShouldRenderContent(true);
        // Scroll to top when new content loads
        window.scrollTo({ top: 0, behavior: "instant" });
        timeout = setTimeout(() => {
          setShowLoading(false);
          setIsCompleted(false);
        }, 500);
      }
    }

    return () => {
      clearTimeout(timeout);
      clearTimeout(safetyTimeout);
      clearTimeout(debugTimeout);
    };
  }, [isLoading, isCompleted, showLoading]);

  // Handle loading completion
  const handleLoadComplete = () => {
    console.log('PageTransition: Load complete callback triggered');
    setIsCompleted(true);
    // Wait a moment before rendering content to allow for transition
    setTimeout(() => {
      setShowLoading(false);
      setShouldRenderContent(true);
      console.log('PageTransition: Content rendering after animation');
    }, 800); // Increased from 600ms to ensure smoother transition
  };

  // Add debug logging for component state
  useEffect(() => {
    console.log(`PageTransition state: isLoading=${isLoading}, showLoading=${showLoading}, isCompleted=${isCompleted}, shouldRenderContent=${shouldRenderContent}`);
  }, [isLoading, showLoading, isCompleted, shouldRenderContent]);

  if (isLoading && showLoading && !isCompleted) {
    console.log('PageTransition: Rendering PreLoader');
    return <PreLoader onLoadComplete={handleLoadComplete} />;
  }

  // Only render content when we should
  if (!shouldRenderContent) {
    console.log('PageTransition: Waiting for content to be ready');
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
        ease: "easeOut",
      }}
      style={{
        willChange: "opacity, transform",
        backfaceVisibility: "hidden",
      }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}
