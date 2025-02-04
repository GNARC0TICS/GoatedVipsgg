import { useState, useRef, useEffect } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  PanInfo,
} from "framer-motion";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

const useWagerTotal = () => {
  const { data } = useQuery({
    queryKey: ['wager-total'],
    queryFn: async () => {
      const lastUpdate = localStorage.getItem('lastWagerUpdate');
      const lastTotal = localStorage.getItem('lastWagerTotal');
      const now = new Date().getTime();

      if (lastUpdate && lastTotal && (now - parseInt(lastUpdate)) < 86400000) {
        return parseInt(lastTotal);
      }

      const response = await fetch('/api/affiliate/stats');
      const data = await response.json();

      const total = data?.data?.all_time?.data?.reduce((sum: number, entry: any) => {
        const wager = entry?.wagered?.all_time || 0;
        return sum + wager;
      }, 0) || 0;

      const roundedTotal = Math.floor(total);

      localStorage.setItem('lastWagerUpdate', now.toString());
      localStorage.setItem('lastWagerTotal', roundedTotal.toString());

      return roundedTotal;
    },
    refetchInterval: 86400000,
    staleTime: 86400000
  });
  return data;
};

const announcements = [
  { text: "WAGER RACES", link: "/wager-races" },
  { text: "LIVE LEADERBOARDS", link: "#leaderboard" },
  { text: "BONUS CODES", link: "/bonus-codes" },
  { text: "AFFILIATE REWARDS", link: "/vip-program" },
  { text: "TELEGRAM GROUP", link: "/telegram" },
  { text: "AIRDROP NEWS", link: "/goated-token" },
  { text: "PROVABLY FAIR", link: "/provably-fair" },
  { text: "LIVE SUPPORT", link: "/help" },
  { text: "WEEKLY LIVE STREAM", link: "/telegram" },
  { text: "CHALLENGES & GIVEAWAYS", link: "/wager-races" },
  { text: "BECOME AN AFFILIATE", link: "/vip-program" },
  { text: "JOIN THE GOATS TODAY!", link: "/auth" },
  { text: "$2231+ GIVEN TO OUR PLAYERS", link: "/wager-races" },
  { text: "NEWSLETTER SUBSCRIPTION", link: "/notification-preferences" }
];

export const FeatureCarousel = () => {
  const totalWager = useWagerTotal();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [, setLocation] = useLocation();
  const [isDragging, setIsDragging] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const dragX = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const wrap = (index: number) => {
    if (index < 0) return announcements.length - 1;
    if (index >= announcements.length) return 0;
    return index;
  };

  const nextSlide = () => {
    if (!isDragging) {
      setDirection('next');
      setCurrentIndex((prev) => wrap(prev + 1));
    }
  };

  const prevSlide = () => {
    if (!isDragging) {
      setDirection('prev');
      setCurrentIndex((prev) => wrap(prev - 1));
    }
  };

  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    setIsDragging(false);
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    const width = window.innerWidth;
    const dragThreshold = width * 0.1; // More sensitive threshold
    const velocityThreshold = 50; // Lower velocity threshold

    if (Math.abs(velocity) > velocityThreshold || Math.abs(offset) > dragThreshold) {
      if (offset > 0 || velocity > 0) {
        setDirection('prev');
        setCurrentIndex((prev) => wrap(prev - 1));
      } else {
        setDirection('next');
        setCurrentIndex((prev) => wrap(prev + 1));
      }
    } else {
      // Spring back to center with physics
      dragX.set(0, {
        type: "spring",
        stiffness: 400,
        damping: 30
      });
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isDragging && !isPaused) {
        nextSlide();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isDragging, isPaused]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('mouseenter', () => setIsPaused(true));
      container.addEventListener('mouseleave', () => setIsPaused(false));
    }
    return () => {
      if (container) {
        container.removeEventListener('mouseenter', () => setIsPaused(true));
        container.removeEventListener('mouseleave', () => setIsPaused(false));
      }
    };
  }, []);

  const handleClick = (link: string) => {
    if (!isDragging) {
      if (link.startsWith("#")) {
        const element = document.querySelector(link);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      } else {
        setLocation(link);
      }
    }
  };

  const variants = {
    enter: (direction: 'next' | 'prev') => ({
      x: direction === 'next' ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }
    },
    exit: (direction: 'next' | 'prev') => ({
      zIndex: 0,
      x: direction === 'next' ? -1000 : 1000,
      opacity: 0,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }
    })
  };

  const currentAnnouncements = [
    { text: `+${totalWager?.toLocaleString() || '0'} WAGERED`, link: "/leaderboard" },
    ...announcements
  ];

  return (
    <div ref={containerRef} className="relative h-24 overflow-hidden mb-8 group touch-none">
      <div className="flex justify-center items-center h-full relative">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            dragMomentum={false}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            transition={{
              x: { type: "spring", stiffness: 200, damping: 25 },
              opacity: { duration: 0.3 }
            }}
            style={{ x: dragX }}
            className="absolute w-full flex justify-center items-center touch-pan-y"
          >
            <button
              onClick={() => handleClick(currentAnnouncements[currentIndex].link)}
              className="text-3xl md:text-4xl font-heading font-extrabold bg-gradient-to-r from-[#D7FF00] via-[#D7FF00]/80 to-[#D7FF00]/60 bg-clip-text text-transparent hover:from-[#D7FF00]/80 hover:to-[#D7FF00]/40 transition-all pointer-events-auto px-4"
            >
              {currentAnnouncements[currentIndex].text}
            </button>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};