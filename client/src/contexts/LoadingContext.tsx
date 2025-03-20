import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

// Define loading types for different scenarios
export type LoadingType = "full" | "spinner" | "skeleton" | "none";

// Interface for the context value
interface LoadingContextValue {
  isLoading: boolean;
  loadingType: LoadingType;
  startLoading: (type?: LoadingType, minDuration?: number) => void;
  stopLoading: () => void;
  isLoadingFor: (key: string) => boolean;
  startLoadingFor: (key: string, type?: LoadingType, minDuration?: number) => void;
  stopLoadingFor: (key: string) => void;
}

// Interface for tracking individual loading states
interface LoadingState {
  isLoading: boolean;
  type: LoadingType;
  startTime: number;
  minDuration: number;
}

const LoadingContext = createContext<LoadingContextValue>({
  isLoading: false,
  loadingType: "none",
  startLoading: () => {},
  stopLoading: () => {},
  isLoadingFor: () => false,
  startLoadingFor: () => {},
  stopLoadingFor: () => {},
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
  
  // Track individual loading states by key
  const [loadingStates, setLoadingStates] = useState<Record<string, LoadingState>>({});
  const loadingTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Start loading with the specified type and minimum duration
  const startLoading = useCallback(
    (type: LoadingType = "spinner", minDuration: number = 0) => {
      console.log(`LoadingContext: Starting global loading (${type})`);
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
    console.log('LoadingContext: Stopping global loading');
    const currentTime = Date.now();
    const loadingTime = currentTime - loadingStartTimeRef.current;
    const minDuration = 1200; // Minimum loading time in ms to ensure animation completes

    if (loadingTime >= minDuration) {
      // If we've already shown loading for the minimum time, stop immediately
      console.log('LoadingContext: Minimum duration met, stopping immediately');
      setIsLoading(false);
      setLoadingType("none");
    } else {
      // Otherwise, wait until minimum duration has passed
      const remainingTime = minDuration - loadingTime;
      console.log(`LoadingContext: Waiting ${remainingTime}ms before stopping`);

      loadingTimerRef.current = setTimeout(() => {
        setIsLoading(false);
        setLoadingType("none");
        loadingTimerRef.current = null;
        console.log('LoadingContext: Delayed stop complete');
      }, remainingTime);
    }
  }, []);
  
  // Check if a specific key is in loading state
  const isLoadingFor = useCallback((key: string) => {
    return loadingStates[key]?.isLoading || false;
  }, [loadingStates]);
  
  // Start loading for a specific key
  const startLoadingFor = useCallback((key: string, type: LoadingType = "spinner", minDuration: number = 0) => {
    console.log(`LoadingContext: Starting loading for "${key}" (${type})`);
    
    // Clear any existing timer for this key
    if (loadingTimersRef.current[key]) {
      clearTimeout(loadingTimersRef.current[key]);
      delete loadingTimersRef.current[key];
    }
    
    // Update the loading state for this key
    setLoadingStates(prev => ({
      ...prev,
      [key]: {
        isLoading: true,
        type,
        startTime: Date.now(),
        minDuration
      }
    }));
    
    // Also set global loading state
    startLoading(type, minDuration);
  }, [startLoading]);
  
  // Stop loading for a specific key
  const stopLoadingFor = useCallback((key: string) => {
    console.log(`LoadingContext: Stopping loading for "${key}"`);
    const state = loadingStates[key];
    
    if (!state) {
      console.warn(`LoadingContext: Attempted to stop loading for "${key}" but no loading state exists`);
      return;
    }
    
    const currentTime = Date.now();
    const loadingTime = currentTime - state.startTime;
    
    if (loadingTime >= state.minDuration) {
      // If we've already shown loading for the minimum time, stop immediately
      setLoadingStates(prev => {
        const newState = { ...prev };
        if (newState[key]) {
          newState[key] = {
            ...newState[key],
            isLoading: false
          };
        }
        return newState;
      });
    } else {
      // Otherwise, wait until minimum duration has passed
      const remainingTime = state.minDuration - loadingTime;
      
      loadingTimersRef.current[key] = setTimeout(() => {
        setLoadingStates(prev => {
          const newState = { ...prev };
          if (newState[key]) {
            newState[key] = {
              ...newState[key],
              isLoading: false
            };
          }
          return newState;
        });
        
        delete loadingTimersRef.current[key];
      }, remainingTime);
    }
    
    // Check if any other keys are still loading
    const anyOtherLoading = Object.entries(loadingStates).some(
      ([k, s]) => k !== key && s.isLoading
    );
    
    // If no other keys are loading, stop global loading
    if (!anyOtherLoading) {
      stopLoading();
    }
  }, [loadingStates, stopLoading]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      // Clear global timer
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
      
      // Clear all key-specific timers
      Object.values(loadingTimersRef.current).forEach(timer => {
        clearTimeout(timer);
      });
    };
  }, []);

  // Context value to be provided
  const contextValue: LoadingContextValue = {
    isLoading,
    loadingType,
    startLoading,
    stopLoading,
    isLoadingFor,
    startLoadingFor,
    stopLoadingFor
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
