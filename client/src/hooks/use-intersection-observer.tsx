
import { useEffect, useRef, useState, RefObject } from 'react';

interface UseIntersectionObserverProps {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
  freezeOnceVisible?: boolean;
}

export function useIntersectionObserver({
  root = null,
  rootMargin = '0px',
  threshold = 0,
  freezeOnceVisible = false,
}: UseIntersectionObserverProps = {}): [boolean, RefObject<Element>] {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const elementRef = useRef<Element>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    
    // Early return if element is not available
    if (!element) return;
    
    // If already visible and freeze is enabled, no need to observe
    if (freezeOnceVisible && isIntersecting) return;

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      setIsIntersecting(entry.isIntersecting);
    };

    // Cleanup existing observer before creating a new one
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    try {
      observerRef.current = new IntersectionObserver(observerCallback, {
        root,
        rootMargin,
        threshold,
      });
      
      observerRef.current.observe(element);
    } catch (error) {
      console.error('Intersection Observer error:', error);
    }

    return () => {
      if (observerRef.current) {
        try {
          // Check if element still exists and is a valid Element
          if (element && element instanceof Element) {
            observerRef.current.unobserve(element);
          }
          observerRef.current.disconnect();
        } catch (error) {
          console.error('Error during Intersection Observer cleanup:', error);
        }
      }
    };
  }, [root, rootMargin, threshold, freezeOnceVisible, isIntersecting]);

  return [isIntersecting, elementRef];
}
