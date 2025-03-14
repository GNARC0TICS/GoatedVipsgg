
import { useEffect } from "react";
import { useLocation } from "wouter";

export function ScrollToTopNavigation() {
  const [location] = useLocation();
  
  useEffect(() => {
    // Scroll to the top of the page when location changes
    window.scrollTo({
      top: 0,
      behavior: "instant" // Using "instant" instead of "smooth" for immediate response
    });
  }, [location]);

  return null; // This component doesn't render anything
}
