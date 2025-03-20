import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

// Define loading types for different scenarios
export type LoadingType = "full" | "spinner" | "skeleton" | "none";

// Interface for the context value
interface LoadingContextValue {
  isLoading: boolean;
  loadingType: LoadingType;
  startLoading: (type?: LoadingType, minDuration?: number) => void;
  stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextValue>({
  isLoading: false,
  loadingType: "none",
  startLoading: () => {},
  stopLoading: () => {},
});

/**
 * LoadingProvider component
 * Provides loading state and methods to components throughout the app
 */
export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<LoadingType>("none");
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const loadingStartTimeRef = useRef<number>(0);

  // Start loading with the specified type and minimum duration
  const startLoading = useCallback(
    (type: LoadingType = "spinner", minDuration: number = 0) => {
      // Clear any existing timers
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }

      loadingStartTimeRef.current = Date.now();
      setLoadingType(type);
      setIsLoading(true);
    },
    [],
  );

  // Stop loading with respect to minimum duration
  const stopLoading = useCallback(() => {
    const currentTime = Date.now();
    const loadingTime = currentTime - loadingStartTimeRef.current;
    const minDuration = 1200; // Minimum loading time in ms to ensure animation completes

    if (loadingTime >= minDuration) {
      // If we've already shown loading for the minimum time, stop immediately
      setIsLoading(false);
      setLoadingType("none");
    } else {
      // Otherwise, wait until minimum duration has passed
      const remainingTime = minDuration - loadingTime;

      loadingTimerRef.current = setTimeout(() => {
        setIsLoading(false);
        setLoadingType("none");
        loadingTimerRef.current = null;
      }, remainingTime);
    }
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    };
  }, []);

  // Context value to be provided
  const contextValue: LoadingContextValue = {
    isLoading,
    loadingType,
    startLoading,
    stopLoading,
  };

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
    </LoadingContext.Provider>
  );
}

/**
 * Custom hook to use the loading context
 * @returns LoadingContextValue
 */
export function useLoading(): LoadingContextValue {
  const context = useContext(LoadingContext);

  if (context === undefined) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }

  return context;
}
