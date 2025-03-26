import React, { useEffect, useState } from 'react';
import { GridBackground } from './GridBackground';
import { GridBackgroundLite } from './GridBackgroundLite';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * BackgroundEffect component
 * 
 * This component acts as a wrapper for the GridBackground components.
 * It provides logic for battery status detection, device capability analysis,
 * and renders the appropriate background based on these factors.
 * 
 * Features:
 * - Detects low battery status and disables animations accordingly
 * - Checks for low-power devices and adjusts background complexity
 * - Falls back to simple backgrounds on mobile or when errors occur
 */
export const BackgroundEffect = () => {
  const isMobile = useIsMobile();
  const [shouldRenderFullBackground, setShouldRenderFullBackground] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    // Determine if we should use the full background
    // Factors to consider:
    // 1. If on mobile, use simplified background
    // 2. If battery is low, use simplified background
    // 3. If device seems low-powered, use simplified background
    
    const checkDeviceCapabilities = () => {
      // If on mobile, default to simplified background
      if (isMobile) {
        setShouldRenderFullBackground(false);
        setIsLoaded(true);
        return;
      }
      
      // Check battery status if available
      if ('getBattery' in navigator) {
        try {
          // @ts-ignore - getBattery() is not in the TypeScript navigator type yet
          navigator.getBattery().then((battery) => {
            // If battery is below 15% and not charging, use simplified background
            if (battery.level < 0.15 && !battery.charging) {
              setShouldRenderFullBackground(false);
            } else {
              setShouldRenderFullBackground(true);
            }
            setIsLoaded(true);
          }).catch(() => {
            // If battery check fails, default to full background
            setShouldRenderFullBackground(true);
            setIsLoaded(true);
          });
        } catch (e) {
          // Safety fallback if getBattery() throws
          setShouldRenderFullBackground(true);
          setIsLoaded(true);
        }
      } else {
        // Simple performance check - could be expanded to be more sophisticated
        const performanceCheck = () => {
          try {
            // Start time
            const start = performance.now();
            
            // Do some calculations
            let result = 0;
            for (let i = 0; i < 1000000; i++) {
              result += Math.sqrt(i);
            }
            
            // End time
            const end = performance.now();
            
            // If the operation took more than 50ms, consider it a lower-powered device
            return (end - start) < 50;
          } catch (e) {
            // Safety fallback if performance check fails
            return !isMobile; // Default to full background on desktop
          }
        };
        
        // Run performance check
        const isHighPerformanceDevice = performanceCheck();
        
        // Set background type based on performance
        setShouldRenderFullBackground(isHighPerformanceDevice);
        setIsLoaded(true);
      }
    };
    
    // Run the check immediately
    checkDeviceCapabilities();
    
    // Re-check on window focus, as battery status might have changed
    window.addEventListener('focus', checkDeviceCapabilities);
    
    return () => {
      window.removeEventListener('focus', checkDeviceCapabilities);
    };
  }, [isMobile]);
  
  if (!isLoaded) {
    // Show nothing until we've determined which background to use
    return null;
  }
  
  return (
    <>
      {shouldRenderFullBackground ? (
        // Render full, complex background for high-performance devices
        <GridBackground />
      ) : (
        // Render simplified background for mobile/low-power devices
        <GridBackgroundLite />
      )}
    </>
  );
}