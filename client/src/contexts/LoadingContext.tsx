import React, { createContext, useContext, useState, useCallback } from 'react';

// Define loading types for different scenarios
export type LoadingType = 'full' | 'spinner' | 'skeleton' | 'none';

// Interface for the context value
interface LoadingContextValue {
  isLoading: boolean;
  loadingType: LoadingType;
  startLoading: (type?: LoadingType) => void;
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

  // Start loading with the specified type
  const startLoading = useCallback((type: LoadingType = 'spinner') => {
    setLoadingType(type);
    setIsLoading(true);
  }, []);

  // Stop loading and reset the type
  const stopLoading = useCallback(() => {
    setIsLoading(false);
    setLoadingType('none');
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
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  
  return context;
}