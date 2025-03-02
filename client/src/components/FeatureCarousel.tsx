import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {useAuth} from '@/lib/auth'; //Hypothetical auth context
import {useToast} from '@/hooks/use-toast';


const useWagerTotal = () => {
  const { toast } = useToast();
  const [cachedTotal, setCachedTotal] = useState(() => {
    const stored = localStorage.getItem('wagerTotal');
    return stored ? parseInt(stored, 10) : 0;
  });

  const { data } = useQuery({
    queryKey: ['wager-total'],
    queryFn: async () => {
      try {
        // Use the dedicated endpoint for total wager
        const response = await fetch('/api/stats/total-wager');
        if (!response.ok) throw new Error('Failed to fetch wager stats');
        
        const result = await response.json();
        const total = result?.data?.total;
        
        if (total !== undefined && total > 0) {
          localStorage.setItem('wagerTotal', total.toString());
          setCachedTotal(total);
          return total;
        }
        return cachedTotal || 0;
      } catch (error) {
        console.error('Error fetching wager total:', error);
        // Fall back to cached value on error
        return cachedTotal || 0;
      }
    },
    refetchInterval: 300000, // Refresh every 5 minutes
    staleTime: 60000, // Consider data stale after 1 minute
  });
  
  return data || cachedTotal || 0;
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
  { text: "NEWSLETTER SUBSCRIPTION", link: "/notification-preferences" }
];

export const FeatureCarousel = () => {
  const totalWager = useWagerTotal();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [, setLocation] = useLocation();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const items = totalWager ? [
    { text: `+${totalWager?.toLocaleString()} WAGERED`, link: "/leaderboard" },
    ...announcements
  ] : [];

  const wrap = (index: number) => {
    if (index < 0) return items.length - 1;
    if (index >= items.length) return 0;
    return index;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isDragging) {
        setDirection('next');
        setCurrentIndex(prev => wrap(prev + 1));
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isDragging, items.length]);

  const handleDragStart = (event: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    setDragStart('touches' in event ? event.touches[0].clientX : event.clientX);
  };

  const handleDragEnd = (event: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;

    const endX = 'changedTouches' in event ? event.changedTouches[0].clientX : event.clientX;
    const diff = endX - dragStart;
    const threshold = window.innerWidth * 0.15;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        setDirection('prev');
        setCurrentIndex(prev => wrap(prev - 1));
      } else {
        setDirection('next');
        setCurrentIndex(prev => wrap(prev + 1));
      }
    }

    setIsDragging(false);
  };

  const handleClick = (link: string) => {
    if (!isDragging) {
      if (link === '/bonus-codes' && !isAuthenticated) {
        toast({
          variant: "warning",
          title: "Authentication Required",
          description: "Please sign in to access bonus codes"
        });
        setLocation('/');
        return;
      }
      if (link.startsWith("#")) {
        const element = document.querySelector(link);
        element?.scrollIntoView({ behavior: "smooth" });
      } else {
        setLocation(link);
      }
    }
  };

  const variants = {
    enter: (direction: 'next' | 'prev') => ({
      x: direction === 'next' ? 1000 : -1000,
      opacity: 0,
      scale: 0.8,
      rotateY: direction === 'next' ? 45 : -45,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      rotateY: 0,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 25 },
        opacity: { duration: 0.2 },
        scale: { type: "spring", stiffness: 200, damping: 20 },
        rotateY: { type: "spring", stiffness: 250, damping: 25 }
      }
    },
    exit: (direction: 'next' | 'prev') => ({
      x: direction === 'next' ? -1000 : 1000,
      opacity: 0,
      scale: 0.8,
      rotateY: direction === 'next' ? -45 : 45,
    }),
  };

  return (
    <div className="relative h-24 overflow-hidden mb-8 select-none" style={{ perspective: '1000px' }}>
      <div 
        className="flex justify-center items-center h-full relative"
        onTouchStart={handleDragStart}
        onTouchEnd={handleDragEnd}
        onMouseDown={handleDragStart}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        <AnimatePresence initial={false} custom={direction} mode="wait">
          {items.length > 0 && ( //Added conditional rendering
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              className="absolute w-full flex justify-center items-center cursor-pointer"
            >
              <button
                onClick={() => handleClick(items[currentIndex].link)}
                className="text-3xl md:text-4xl font-heading font-extrabold bg-gradient-to-r from-[#D7FF00] via-[#D7FF00]/80 to-[#D7FF00]/60 bg-clip-text text-transparent hover:from-[#D7FF00]/80 hover:to-[#D7FF00]/40 transition-all px-4"
              >
                {items[currentIndex].text}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};