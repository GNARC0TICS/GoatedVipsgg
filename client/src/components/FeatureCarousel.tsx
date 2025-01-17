import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPaused) {
        setCurrentIndex((prev) => (prev + 1) % features.length);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isPaused]);

  const variants = {
    enter: {
      opacity: 0,
      y: 20,
      scale: 0.95,
    },
    center: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.95,
      transition: {
        duration: 0.3,
        ease: [0.16, 1, 0.3, 1],
      },
    },
    hover: {
      scale: 1.05,
      textShadow: "0 0 8px rgba(215, 255, 0, 0.6)",
      transition: {
        duration: 0.2,
        ease: "easeInOut",
      },
    },
  };

  return (
    <div 
      className="relative h-32 flex items-center justify-center overflow-hidden mt-8 mb-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background glow effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-radial from-[#D7FF00]/5 via-transparent to-transparent opacity-0"
        animate={{
          opacity: isPaused ? 0.6 : 0,
          scale: isPaused ? 1.1 : 1,
        }}
        transition={{ duration: 0.3 }}
      />

      <AnimatePresence mode="wait">
        <motion.h1
          key={currentIndex}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          whileHover="hover"
          className="absolute text-3xl md:text-5xl lg:text-6xl font-heading font-extrabold uppercase bg-gradient-to-r from-[#D7FF00] via-[#D7FF00]/80 to-[#D7FF00]/60 bg-clip-text text-transparent cursor-default select-none animate-scroll"
        >
          {features[currentIndex]}
        </motion.h1>
      </AnimatePresence>

      {/* Interactive Progress Indicators */}
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