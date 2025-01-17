
import { useState, useRef, useEffect } from "react";
import { motion, useAnimationControls } from "framer-motion";

const features = [
  "PROVABLY FAIR",
  "INSTANT WITHDRAWALS",
  "24/7 SUPPORT",
  "WEEKLY BONUSES",
  "VIP REWARDS"
];

export const FeatureCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimationControls();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % features.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div ref={containerRef} className="relative overflow-hidden w-full">
      <div className="flex justify-center items-center">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            className="px-8"
            animate={{
              scale: index === currentIndex ? 1.1 : 0.9,
              opacity: index === currentIndex ? 1 : 0.5,
              x: `${(index - currentIndex) * 100}%`,
              transition: {
                duration: 0.5,
                ease: "easeInOut"
              }
            }}
          >
            <motion.h1 className="text-3xl md:text-5xl lg:text-6xl font-heading font-extrabold uppercase bg-gradient-to-r from-[#D7FF00] via-[#D7FF00]/80 to-[#D7FF00]/60 bg-clip-text text-transparent cursor-default select-none">
              {feature}
            </motion.h1>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
