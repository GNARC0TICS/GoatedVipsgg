import { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * Custom hook to prevent page refreshes and redirects
 * This helps eliminate any remaining refresh issues that might be present
 * 
 * This is especially important for preventing port-related navigation issues
 */
export function usePreventRefresh() {
  const [_, setLocation] = useLocation();
  
  useEffect(() => {
    // Function to intercept links with port conflicts
    const interceptLinks = (event: MouseEvent) => {
      // Only handle links
      const target = event.target as HTMLElement;
      const link = target.closest('a');
      
      if (!link) return;
      
      // Skip links that are already handled by our Link component
      if (link.getAttribute('data-client-route') === 'true') return;
      
      // Skip links with targets like _blank
      if (link.target && link.target !== '_self') return;
      
      // Check if this is an internal link (same origin)
      const url = new URL(link.href, window.location.origin);
      const isSameOrigin = url.origin === window.location.origin;
      
      // Handle only internal links
      if (isSameOrigin) {
        // Prevent the default navigation
        event.preventDefault();
        
        // Use wouter navigation instead
        setLocation(url.pathname + url.search + url.hash);
        
        console.debug(`Intercepted navigation to: ${url.pathname}`);
      }
    };
    
    // Store the original replaceState and pushState methods
    const originalReplaceState = window.history.replaceState;
    const originalPushState = window.history.pushState;
    
    // Override with custom implementations that correctly handle port changes
    window.history.replaceState = function(...args) {
      // Call original but prevent unwanted side effects
      const result = originalReplaceState.apply(this, args);
      
      // Dispatch a custom event for any listeners
      window.dispatchEvent(new Event('locationchange'));
      
      return result;
    };
    
    window.history.pushState = function(...args) {
      // Call original but prevent unwanted side effects
      const result = originalPushState.apply(this, args);
      
      // Dispatch a custom event for any listeners
      window.dispatchEvent(new Event('locationchange'));
      
      return result;
    };
    
    // Handle browser's back/forward navigation without causing refreshes
    const handlePopState = () => {
      // PopState event is not cancelable, we can only react to it
      console.debug('Handling popstate: ', window.location.pathname);
      
      // Dispatch a custom event to notify location change without refresh
      window.dispatchEvent(new Event('locationchange'));
    };
    
    // Listen for all navigation events
    window.addEventListener('popstate', handlePopState);
    document.addEventListener('click', interceptLinks);
    
    // Restore original methods on cleanup
    return () => {
      window.history.replaceState = originalReplaceState;
      window.history.pushState = originalPushState;
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', interceptLinks);
    };
  }, [setLocation]);
}