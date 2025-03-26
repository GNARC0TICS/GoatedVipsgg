import { useEffect, useState } from 'react';
import { GridBackground } from './GridBackground';
import { GridBackgroundLite } from './GridBackgroundLite';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * Background effect component that automatically selects the appropriate
 * background based on device capabilities
 */
export const BackgroundEffect = () => {
  const isMobile = useIsMobile();
  const [useLite, setUseLite] = useState(false);
  
  useEffect(() => {
    // Check if we should use lite version based on:
    // 1. Mobile device
    // 2. Battery status (if available)
    // 3. System memory (if available)
    // 4. Device performance (using a simple benchmark)
    
    const checkPerformance = async () => {
      // Always use lite version on mobile
      if (isMobile) {
        setUseLite(true);
        return;
      }
      
      // Try to check battery status
      try {
        // @ts-ignore - Battery API may not be available in all browsers
        if (navigator.getBattery) {
          // @ts-ignore
          const battery = await navigator.getBattery();
          if (battery.charging === false && battery.level < 0.3) {
            // If battery is low and not charging, use lite version
            setUseLite(true);
            return;
          }
        }
      } catch (e) {
        // Battery API not available, continue with other checks
      }
      
      // Simple performance check
      const start = performance.now();
      let counter = 0;
      
      // Simple benchmark - do some calculations
      for (let i = 0; i < 1000000; i++) {
        counter += Math.sqrt(i);
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // If the benchmark took more than 100ms, use lite version
      if (duration > 100) {
        setUseLite(true);
        return;
      }
      
      // Default to full version
      setUseLite(false);
    };
    
    checkPerformance();
  }, [isMobile]);
  
  // Render the appropriate background
  return useLite ? <GridBackgroundLite /> : <GridBackground />;
};