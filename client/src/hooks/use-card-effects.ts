import { useEffect, useRef } from 'react';
import { initializePremiumCards, enhanceTableRows } from '@/utils/card-effects';

/**
 * Hook to initialize card effects on component mount
 * @param options - Configuration options
 * @param options.initializeCards - Whether to initialize premium cards
 * @param options.enhanceTables - Whether to enhance table rows
 * @param options.selector - CSS selector for the container element
 * @returns ref to attach to the container element
 */
export function useCardEffects({
  initializeCards = true,
  enhanceTables = false,
  selector = '.premium-card',
}: {
  initializeCards?: boolean;
  enhanceTables?: boolean;
  selector?: string;
} = {}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Wait for the next frame to ensure the DOM is ready
    const timeoutId = setTimeout(() => {
      if (initializeCards) {
        initializePremiumCards();
      }
      
      if (enhanceTables) {
        enhanceTableRows();
      }
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [initializeCards, enhanceTables, selector]);

  return containerRef;
}

/**
 * Hook to apply shimmer effect to elements during loading states
 * @param isLoading - Whether the component is in a loading state
 * @param selector - CSS selector for elements to apply shimmer effect
 */
export function useShimmerEffect(isLoading: boolean, selector: string) {
  useEffect(() => {
    const elements = document.querySelectorAll(selector);
    
    elements.forEach(element => {
      if (isLoading) {
        element.classList.add('shimmer');
      } else {
        element.classList.remove('shimmer');
      }
    });
  }, [isLoading, selector]);
}
