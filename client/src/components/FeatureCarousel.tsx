import { useState, useRef, useEffect } from "react";
import { motion, useAnimationControls } from "framer-motion";

const features = [
  "EXCLUSIVE REWARDS",
  "WAGER RACES", 
  "TIPS & TRICKS",
  "COMMUNITY CHALLENGES",
  "INSTANT PAYOUTS",
  "BONUS CODES",
  "LIVE UPDATES"
];

export function FeatureCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimationControls();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % features.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleDragEnd = (event: any, info: any) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (Math.abs(velocity) > 500) {
      const direction = velocity < 0 ? 1 : -1;
      const newIndex = (currentIndex + direction + features.length) % features.length;
      setCurrentIndex(newIndex);
    } else if (Math.abs(offset) > 50) {
      const direction = offset < 0 ? 1 : -1;
      const newIndex = (currentIndex + direction + features.length) % features.length;
      setCurrentIndex(newIndex);
    }
  };

  return (
    <div className="relative h-32 flex items-center justify-center overflow-hidden mt-8 mb-4">
      <motion.div
        ref={containerRef}
        className="flex items-center cursor-grab active:cursor-grabbing"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
      >
        {features.map((text, index) => (
          <motion.div
            key={index}
            className="px-8"
            animate={{
              scale: index === currentIndex ? 1.2 : 0.8,
              opacity: index === currentIndex ? 1 : 0.3,
              x: `${(index - currentIndex) * 100}%`
            }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              duration: 0.5
            }}
          >
            <motion.h1
              className="text-3xl md:text-5xl lg:text-6xl font-heading font-extrabold uppercase bg-gradient-to-r from-[#D7FF00] via-[#D7FF00]/80 to-[#D7FF00]/60 bg-clip-text text-transparent cursor-default select-none"
              animate={controls}
            >
              {text}
            </motion.h1>
          </motion.div>
        ))}
      </motion.div>

      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex gap-2">
        {features.map((_, index) => (
          <motion.button
            key={index}
            className={`w-2 h-2 rounded-full ${
              index === currentIndex ? "bg-[#D7FF00]" : "bg-[#D7FF00]/20"
            }`}
            onClick={() => setCurrentIndex(index)}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            animate={{
              scale: index === currentIndex ? 1.2 : 1,
              opacity: index === currentIndex ? 1 : 0.5,
            }}
            transition={{ duration: 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}