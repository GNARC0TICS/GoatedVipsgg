import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

// Define loading types for different scenarios
export type LoadingType = 'full' | 'spinner' | 'skeleton' | 'none';

// Interface for the context value
interface LoadingContextValue {
  isLoading: boolean;
  loadingType: LoadingType;
  startLoading: (type?: LoadingType, minDuration?: number) => void;
  stopLoading: () => void;
}

// Create the context with a default value
const LoadingContext = createContext<LoadingContextValue>({
  isLoading: false,
  loadingType: 'none',
  startLoading: () => {},
  stopLoading: () => {},
});

/**
 * LoadingProvider component
 * Provides loading state and methods to components throughout the app
 */
export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<LoadingType>('none');
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const loadingStartTimeRef = useRef<number>(0);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initialProgress, setInitialProgress] = useState(0);

  // Simulate a more realistic loading progress with guaranteed visual completion
  useEffect(() => {
    let timer: NodeJS.Timeout;
    let progressTimer: NodeJS.Timeout;

    // Create a realistic progressive loading simulation
    const simulateProgress = () => {
      let progress = 0;
      progressTimer = setInterval(() => {
        // Slow down as we get closer to completion
        const increment = progress < 70 ? 5 : (progress < 90 ? 2 : 0.5);
        progress = Math.min(progress + increment, 98); // Cap at 98% until really complete
        setInitialProgress(progress);
      }, 150);
    };

    // Start simulating progress
    simulateProgress();

    // Ensure completion after a reasonable maximum time
    timer = setTimeout(() => {
      clearInterval(progressTimer);
      setInitialProgress(100);

      // Add a small delay to show 100% before completing
      setTimeout(() => {
        setIsAppLoading(false);
      }, 600);
    }, 3000); // Complete after 3 seconds max

    return () => {
      clearTimeout(timer);
      clearInterval(progressTimer);
    };
  }, []);

  // Start loading with the specified type and minimum duration
  const startLoading = useCallback((type: LoadingType = 'spinner', minDuration: number = 0) => {
    // Clear any existing timers
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }

    loadingStartTimeRef.current = Date.now();
    setLoadingType(type);
    setIsLoading(true);
  }, []);

  // Stop loading with respect to minimum duration
  const stopLoading = useCallback(() => {
    const currentTime = Date.now();
    const loadingTime = currentTime - loadingStartTimeRef.current;
    const minDuration = 1200; // Minimum loading time in ms to ensure animation completes

    if (loadingTime >= minDuration) {
      // If we've already shown loading for the minimum time, stop immediately
      setIsLoading(false);
      setLoadingType('none');
    } else {
      // Otherwise, wait until minimum duration has passed
      const remainingTime = minDuration - loadingTime;

      loadingTimerRef.current = setTimeout(() => {
        setIsLoading(false);
        setLoadingType('none');
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
      {isAppLoading ? (
        <MainPreloader // Assuming MainPreloader component exists
          useRandomProgressBar={false}
          progress={initialProgress}
          onLoadComplete={() => {
            setIsAppLoading(false);
            setIsInitialized(true);
          }}
        />
      ) : (
        children
      )}
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
    throw new Error('useLoading must be used within a LoadingProvider');
  }

  return context;
}