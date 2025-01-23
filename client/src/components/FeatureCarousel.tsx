
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
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
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);

  const nextSlide = () => {
    if (!isDragging) {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }
  };

  const prevSlide = () => {
    if (!isDragging) {
      setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
    }
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    const threshold = 50;
    if (Math.abs(info.offset.x) > threshold) {
      if (info.offset.x > 0) {
        prevSlide();
      } else {
        nextSlide();
      }
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isDragging) {
        nextSlide();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isDragging]);

  const handleClick = (link: string) => {
    if (!isDragging) {
      if (link.startsWith('#')) {
        const element = document.querySelector(link);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        setLocation(link);
      }
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="relative h-24 overflow-hidden mb-8 group touch-none"
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
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ 
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
            style={{ x }}
            className="text-center px-16 touch-none cursor-grab active:cursor-grabbing"
          >
            <button
              onClick={() => handleClick(announcements[currentIndex].link)}
              className="text-3xl md:text-4xl font-heading font-extrabold bg-gradient-to-r from-[#D7FF00] via-[#D7FF00]/80 to-[#D7FF00]/60 bg-clip-text text-transparent hover:from-[#D7FF00]/80 hover:to-[#D7FF00]/40 transition-all pointer-events-auto"
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
