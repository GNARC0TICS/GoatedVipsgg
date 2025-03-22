import { useState, useEffect } from 'react';

export function useScrollPosition(threshold = 20) {
  const [scrolled, setScrolled] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > threshold);
    };
    
    // Set initial value
    handleScroll();
    
    // Add event listener
    window.addEventListener('scroll', handleScroll);
    
    // Clean up
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);
  
  return scrolled;
}
