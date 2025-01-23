
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { ArrowLeftCircle, ArrowRightCircle } from "lucide-react";
import { Link, useLocation } from "wouter";

const announcements = [
  { text: "PROVABLY FAIR GAMING", link: "/vip-program" },
  { text: "INSTANT WITHDRAWALS", link: "/vip-program" },
  { text: "24/7 LIVE SUPPORT", link: "/help" },
  { text: "WEEKLY BONUSES & REWARDS", link: "/bonus-codes" },
  { text: "EXCLUSIVE VIP PROGRAM", link: "/vip-program" },
  { text: "JOIN THE GOATS", link: "/auth" },
  { text: "EXCLUSIVE UPDATES", link: "/notification-preferences" },
  { text: "LEADERBOARD RANKINGS", link: "#leaderboard" },
  { text: "HELP & SUPPORT", link: "/help" }
];

export const FeatureCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

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

  const handleClick = (link: string) => {
    if (link.startsWith('#')) {
      const element = document.querySelector(link);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      setLocation(link);
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="relative h-24 overflow-hidden mb-8 group touch-none"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div className="flex justify-center items-center h-full relative">
        <button 
          onClick={prevSlide}
          className="absolute left-4 text-[#D7FF00] opacity-0 group-hover:opacity-100 hover:text-[#D7FF00]/80 transition-all"
        >
          <ArrowLeftCircle className="w-6 h-6" />
        </button>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
            className="text-center px-16"
          >
            <button
              onClick={() => handleClick(announcements[currentIndex].link)}
              className="text-3xl md:text-4xl font-heading font-extrabold bg-gradient-to-r from-[#D7FF00] via-[#D7FF00]/80 to-[#D7FF00]/60 bg-clip-text text-transparent hover:from-[#D7FF00]/80 hover:to-[#D7FF00]/40 transition-all cursor-pointer"
            >
              {announcements[currentIndex].text}
            </button>
          </motion.div>
        </AnimatePresence>

        <button 
          onClick={nextSlide}
          className="absolute right-4 text-[#D7FF00] opacity-0 group-hover:opacity-100 hover:text-[#D7FF00]/80 transition-all"
        >
          <ArrowRightCircle className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
