
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface AnimatedBannerProps {
  text: string;
  speed?: number;
  className?: string;
  textClassName?: string;
}

export function AnimatedBanner({
  text,
  speed = 40,
  className = "",
  textClassName = "",
}: AnimatedBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !contentRef.current) return;

    const container = containerRef.current;
    const content = contentRef.current;
    
    // Clone the content to create a seamless loop
    const clone = content.cloneNode(true) as HTMLDivElement;
    container.appendChild(clone);
    
    // Calculate animation duration based on content width and speed
    const setAnimationDuration = () => {
      const contentWidth = content.offsetWidth;
      const duration = contentWidth / speed;
      container.style.setProperty('--duration', `${duration}s`);
    };
    
    setAnimationDuration();
    window.addEventListener('resize', setAnimationDuration);
    
    return () => {
      window.removeEventListener('resize', setAnimationDuration);
    };
  }, [speed, text]);

  return (
    <div className={`overflow-hidden ${className}`}>
      <style jsx>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .scroll-container {
          display: flex;
          animation: scroll var(--duration, 40s) linear infinite;
          will-change: transform;
        }
      `}</style>
      <div ref={containerRef} className="scroll-container">
        <div ref={contentRef} className={`flex items-center flex-nowrap whitespace-nowrap ${textClassName}`}>
          {Array(10).fill(text).map((item, index) => (
            <span key={index} className="mx-4">{item}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
