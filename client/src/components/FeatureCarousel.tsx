
import { useState, useRef, useEffect } from "react";
import { motion, useAnimationControls, AnimatePresence } from "framer-motion";
import { ArrowLeftCircle, ArrowRightCircle } from "lucide-react";

const announcements = [
  "PROVABLY FAIR GAMING",
  "INSTANT WITHDRAWALS",
  "24/7 LIVE SUPPORT",
  "WEEKLY BONUSES & REWARDS",
  "EXCLUSIVE VIP PROGRAM"
];

export const FeatureCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % announcements.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
  };

  useEffect(() => {
    const interval = setInterval(nextSlide, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div ref={containerRef} className="relative h-24 overflow-hidden bg-[#1A1B21]/50 backdrop-blur-sm rounded-lg border border-[#2A2B31] mb-8">
      <div className="flex justify-center items-center h-full relative">
        <button 
          onClick={prevSlide}
          className="absolute left-4 text-[#D7FF00] hover:text-[#D7FF00]/80 transition-colors"
        >
          <ArrowLeftCircle className="w-6 h-6" />
        </button>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="text-center px-16"
          >
            <h2 className="text-3xl md:text-4xl font-heading font-extrabold bg-gradient-to-r from-[#D7FF00] via-[#D7FF00]/80 to-[#D7FF00]/60 bg-clip-text text-transparent">
              {announcements[currentIndex]}
            </h2>
          </motion.div>
        </AnimatePresence>

        <button 
          onClick={nextSlide}
          className="absolute right-4 text-[#D7FF00] hover:text-[#D7FF00]/80 transition-colors"
        >
          <ArrowRightCircle className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
