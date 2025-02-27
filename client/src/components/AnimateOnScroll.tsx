
import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useIntersectionObserver } from '../hooks/use-intersection-observer';

interface AnimateOnScrollProps {
  children: ReactNode;
  animation?: 'fadeIn' | 'slideUp' | 'scale';
  delay?: number;
  threshold?: number;
  className?: string;
}

export function AnimateOnScroll({
  children,
  animation = 'fadeIn',
  delay = 0,
  threshold = 0.1,
  className = '',
}: AnimateOnScrollProps) {
  const [isVisible, ref] = useIntersectionObserver({
    threshold,
    freezeOnceVisible: true,
  });

  const animations = {
    fadeIn: {
      initial: { opacity: 0 },
      animate: isVisible ? { opacity: 1 } : { opacity: 0 },
      transition: { duration: 0.6, delay }
    },
    slideUp: {
      initial: { opacity: 0, y: 20 },
      animate: isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
      transition: { duration: 0.6, delay }
    },
    scale: {
      initial: { opacity: 0, scale: 0.8 },
      animate: isVisible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 },
      transition: { duration: 0.6, delay }
    }
  };

  const selectedAnimation = animations[animation];

  return (
    <motion.div
      ref={ref as React.RefObject<HTMLDivElement>}
      initial={selectedAnimation.initial}
      animate={selectedAnimation.animate}
      transition={selectedAnimation.transition}
      className={className}
    >
      {children}
    </motion.div>
  );
}
