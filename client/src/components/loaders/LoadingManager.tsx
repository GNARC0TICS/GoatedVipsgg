import { useLoading } from "../../contexts/LoadingContext";
import { MainPreloader } from "./MainPreloader";
import { Spinner } from "./Spinner";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback } from "react";

/**
 * LoadingManager
 * 
 * Central component that manages and displays different types of loading states
 * This is used by the LoadingProvider to show the appropriate loading UI
 */
export function LoadingManager() {
  const { isLoading, loadingType, stopLoading } = useLoading();

  // Handle when loading is complete
  const handleLoadComplete = useCallback(() => {
    stopLoading();
  }, [stopLoading]);

  // If not loading, don't render anything
  if (!isLoading) return null;

  return (
    <AnimatePresence mode="wait">
      {isLoading && (
        <>
          {/* Full-screen preloader with logo and progress bar */}
          {loadingType === "full" && (
            <MainPreloader 
              onLoadComplete={handleLoadComplete} 
              useRandomProgressBar={true}
            />
          )}

          {/* Simple spinner overlay for lighter loading states */}
          {loadingType === "spinner" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/25 backdrop-blur-sm z-50 flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="bg-[#1A1B21]/90 border border-[#2A2B31] rounded-lg p-4 shadow-xl"
              >
                <Spinner size="lg" text="Loading..." centered />
              </motion.div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}