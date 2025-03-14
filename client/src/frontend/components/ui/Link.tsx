import React, { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  activeClass?: string;
  children: React.ReactNode;
  replaceState?: boolean; // Optional: use replaceState instead of pushState
  external?: boolean; // Optional: true for external links that should open normally
}

/**
 * Enhanced Link component that uses wouter's useLocation
 * to provide client-side navigation without page refreshes
 * 
 * Handles port conflicts by using relative paths and preventing full page reloads
 */
export function Link({ 
  to, 
  activeClass = 'active', 
  className = '', 
  children,
  replaceState = false,
  external = false,
  ...props 
}: LinkProps) {
  const [location, setLocation] = useLocation();
  const linkRef = useRef<HTMLAnchorElement>(null);
  
  // Check if this is an absolute URL (with protocol or starting with //)
  const isExternalUrl = external || to.match(/^(https?:)?\/\//i);
  
  // For internal links, normalize the path to ensure it's relative
  const normalizedPath = isExternalUrl ? to : to.startsWith('/') ? to : `/${to}`;
  
  const isActive = location === normalizedPath;
  const combinedClassName = `${className} ${isActive ? activeClass : ''}`.trim();
  
  // Enhanced click handler with better error handling and state management
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Allow normal browser behavior for external links
    if (isExternalUrl) return;
    
    // Prevent default browser navigation for internal links
    e.preventDefault();
    e.stopPropagation();  // Prevent event bubbling
    
    try {
      // Only navigate if we're not already on this page
      if (!isActive) {
        // Use the setLocation from wouter, which properly updates the history
        setLocation(normalizedPath, { replace: replaceState });
        
        // Manual dispatch of a navigation event for any listeners
        window.dispatchEvent(new CustomEvent('navigation', { 
          detail: { from: location, to: normalizedPath }
        }));
        
        // Log navigation for debugging
        console.debug(`Navigating from ${location} to ${normalizedPath} (client-side)`);
      } else {
        console.debug(`Already at ${normalizedPath}, no navigation needed`);
      }
    } catch (error) {
      console.error("Navigation error:", error);
      
      // Fallback: update URL without reloading in case of error
      if (replaceState) {
        window.history.replaceState(null, '', normalizedPath);
      } else {
        window.history.pushState(null, '', normalizedPath);
      }
    }
  };
  
  // Ensure links pointing to the current location don't trigger navigation
  useEffect(() => {
    if (linkRef.current) {
      // Adding data attribute for styling and debugging purposes
      if (isActive) {
        linkRef.current.setAttribute('data-current-location', 'true');
      } else {
        linkRef.current.removeAttribute('data-current-location');
      }
    }
  }, [isActive, normalizedPath]);
  
  return (
    <a 
      ref={linkRef}
      href={normalizedPath} 
      className={combinedClassName} 
      onClick={handleClick}
      data-client-route={isExternalUrl ? 'false' : 'true'}
      target={isExternalUrl && props.target ? props.target : undefined}
      rel={isExternalUrl ? 'noopener noreferrer' : undefined}
      {...props}
    >
      {children}
    </a>
  );
}