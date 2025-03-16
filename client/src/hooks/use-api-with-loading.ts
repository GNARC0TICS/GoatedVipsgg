
import { useState, useEffect, useRef } from 'react';
import { useLoading } from '../contexts/LoadingContext';

/**
 * Custom hook for making API requests with integrated loading state management
 * 
 * @param fetchFn - The function that performs the API request
 * @param loadingType - The type of loading animation to show
 * @param dependencies - Array of dependencies that should trigger a refetch
 * @param minLoadingTime - Minimum time to show loading state (ms)
 * @returns {Object} - The result of the API call and loading state
 */
export function useApiWithLoading<T>(
  fetchFn: () => Promise<T>,
  loadingType: 'full' | 'spinner' | 'skeleton' = 'spinner',
  dependencies: any[] = [],
  minLoadingTime: number = 1200
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);
  const { startLoading, stopLoading } = useLoading();
  
  useEffect(() => {
    isMounted.current = true;
    
    const fetchData = async () => {
      try {
        setError(null);
        startLoading(loadingType, minLoadingTime);
        
        const result = await fetchFn();
        
        if (isMounted.current) {
          setData(result);
        }
      } catch (err) {
        if (isMounted.current) {
          setError(err instanceof Error ? err : new Error('An unknown error occurred'));
        }
      } finally {
        if (isMounted.current) {
          stopLoading();
        }
      }
    };
    
    fetchData();
    
    return () => {
      isMounted.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
  
  // Function to manually refetch data
  const refetch = async () => {
    try {
      setError(null);
      startLoading(loadingType, minLoadingTime);
      
      const result = await fetchFn();
      
      if (isMounted.current) {
        setData(result);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('An unknown error occurred'));
      }
    } finally {
      if (isMounted.current) {
        stopLoading();
      }
    }
  };
  
  return { data, error, refetch };
}
