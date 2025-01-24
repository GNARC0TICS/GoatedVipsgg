
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { ArrowLeftCircle, ArrowRightCircle } from "lucide-react";
import { Link, useLocation } from "wouter";

const announcements = [
  { text: "WAGER RACES", link: "/wager-races" },
  { text: "BONUS CODES", link: "/bonus-codes" },
  { text: "AFFILIATE REWARDS", link: "/vip-program" },
  { text: "TELEGRAM GROUP", link: "/telegram" },
  { text: "AIRDROP NEWS", link: "/goated-token" },
  { text: "PROVABLY FAIR", link: "/provably-fair" },
  { text: "LIVE LEADERBOARDS", link: "#leaderboard" },
  { text: "LIVE SUPPORT", link: "/help" },
  { text: "PROMOTIONS", link: "/bonus-codes" },
  { text: "WEEKLY LIVE STREAM", link: "/telegram" },
  { text: "CHALLENGES & GIVEAWAYS", link: "/wager-races" },
  { text: "BECOME AN AFFILIATE", link: "/vip-program" },
  { text: "DAILY CODE DROPS", link: "/bonus-codes" },
  { text: "JOIN THE GOATS TODAY!", link: "/auth" },
  { text: "1700+ ACTIVE MEMBERS", link: "/telegram" },
  { text: "$2231+ GIVEN TO OUR PLAYERS", link: "/wager-races" },
  { text: "MULTIPLIER HUNTS", link: "/telegram" },
  { text: "STRATEGIES AND DISCUSSION", link: "/telegram" },
  { text: "NEWSLETTER SUBSCRIPTION", link: "/notification-preferences" },
  { text: "PROMO CODES", link: "/bonus-codes" },
  { text: "TERMS AND CONDITIONS", link: "/help" },
  { text: "GOATED x GOOMBAS VIPS", link: "/vip-program" }
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

  const dragConstraints = useRef<HTMLDivElement>(null);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    const threshold = 50;
    const velocity = info.velocity.x;
    const offset = info.offset.x;
    
    if (Math.abs(velocity) > 100 || Math.abs(offset) > threshold) {
      if (offset > 0 || velocity > 100) {
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
      <div ref={dragConstraints} className="flex justify-center items-center h-full relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            drag="x"
            dragConstraints={dragConstraints}
            dragElastic={0.5}
            dragMomentum={true}
            dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
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
      </div>
    </div>
  );
};
