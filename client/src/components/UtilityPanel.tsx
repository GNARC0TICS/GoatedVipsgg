import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Gift, MessageCircle, Send, Ticket, Timer, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { FloatingSupport } from "./FloatingSupport";
import { useIsMobile } from "@/hooks/use-mobile";

export function UtilityPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSupport, setIsSupport] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [scrollTimeout, setScrollTimeout] = useState<NodeJS.Timeout | null>(null);
  const [, setLocation] = useLocation();
  const [timeLeft] = useState<string>("Available now!");
  const isSpinAvailable = true;
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleScroll = () => {
      if (isMobile) return; // Disable scroll behavior on mobile

      setIsVisible(false);
      if (scrollTimeout) clearTimeout(scrollTimeout);

      const timeout = setTimeout(() => {
        if (isHovered) {
          setIsVisible(true);
        } else {
          const reappearTimeout = setTimeout(() => {
            setIsVisible(true);
          }, 1000);
          return () => clearTimeout(reappearTimeout);
        }
      }, 150);

      setScrollTimeout(timeout);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [scrollTimeout, isHovered, isMobile]);

  const togglePanel = () => setIsOpen(!isOpen);

  const handleSupportClick = () => {
    setIsSupport(true);
    setIsOpen(false);
  };

  return (
    <>
      {isSupport && <FloatingSupport onClose={() => setIsSupport(false)} />}
      <motion.div 
        className={`fixed z-50 ${isMobile ? 'top-20 right-4' : 'top-20 right-0'}`}
        initial={{ x: 0 }}
        animate={{ x: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
      >
        <motion.div
          className="relative flex items-start"
          animate={{ x: isOpen ? -320 : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
        >
          {/* Panel */}
          <AnimatePresence>
            {(isOpen || !isMobile) && (
              <Card 
                className={`${isMobile ? 'fixed top-24 right-4 w-[calc(100vw-32px)] max-w-[320px]' : 'w-80'} bg-[#1A1B21]/80 backdrop-blur-md border border-[#2A2B31]/50 overflow-hidden shadow-[0_0_25px_rgba(42,43,49,0.3)] hover:shadow-[0_0_30px_rgba(42,43,49,0.4)] transition-all rounded-xl`}
              >
                <div className="grid grid-cols-2 gap-3 p-4">
          {/* Toggle Button */}
          <motion.button
            onClick={togglePanel}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`${isMobile ? 'w-14 h-14 rounded-full' : 'w-12 h-12 rounded-xl ml-3'} bg-[#D7FF00] flex items-center justify-center hover:bg-[#D7FF00]/90 transition-all shadow-[0_0_15px_rgba(215,255,0,0.3)] hover:shadow-[0_0_20px_rgba(215,255,0,0.5)] z-10`}
          >
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {isOpen ? (
                <X className="w-6 h-6 text-[#14151A]" />
              ) : (
                <Gift className="w-6 h-6 text-[#14151A]" />
              )}
            </motion.div>
          </motion.button>

          {/* Panel */}
          <AnimatePresence>
            {(isOpen || !isMobile) && (
              <Card 
                className={`${isMobile ? 'fixed top-24 right-4 w-[calc(100vw-32px)] max-w-[320px]' : 'absolute top-0 left-full w-80'} bg-[#1A1B21]/80 backdrop-blur-md border border-[#2A2B31]/50 overflow-hidden shadow-[0_0_25px_rgba(42,43,49,0.3)] hover:shadow-[0_0_30px_rgba(42,43,49,0.4)] transition-all rounded-xl`}
              >
                <div className="grid grid-cols-2 gap-3 p-4">
                  {/* Daily Spin */}
                  <motion.button
                    onClick={() => setLocation("/wheel-challenge")}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="aspect-square p-4 bg-[#2A2B31]/80 backdrop-blur-sm rounded-xl border border-[#2A2B31]/50 hover:bg-[#2A2B31]/90 transition-all relative group shadow-[0_0_15px_rgba(42,43,49,0.2)] hover:shadow-[0_0_20px_rgba(42,43,49,0.3)] flex flex-col items-center justify-between"
                  >
                    <div className="flex-1 flex items-center justify-center">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <Gift className={`w-10 h-10 ${isSpinAvailable ? 'text-[#D7FF00] drop-shadow-[0_0_8px_rgba(215,255,0,0.3)]' : 'text-[#8A8B91]'}`} />
                      </motion.div>
                    </div>
                    <span className="text-xs text-[#8A8B91] font-medium text-center">Daily Spin</span>
                    {isSpinAvailable && (
                      <motion.span 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-2 right-2 h-2 w-2 bg-[#D7FF00] rounded-full shadow-[0_0_8px_rgba(215,255,0,0.5)]" 
                      />
                    )}
                  </motion.button>

                  {/* Bonus Codes */}
                  <motion.button
                    onClick={() => setLocation("/bonus-codes")}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="aspect-square p-4 bg-[#2A2B31]/80 backdrop-blur-sm rounded-xl border border-[#2A2B31]/50 hover:bg-[#2A2B31]/90 transition-all group flex flex-col items-center justify-between"
                  >
                    <div className="flex-1 flex items-center justify-center">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: -5 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <Ticket className="w-10 h-10 text-[#D7FF00] drop-shadow-[0_0_8px_rgba(215,255,0,0.3)]" />
                      </motion.div>
                    </div>
                    <span className="text-xs text-[#8A8B91] font-medium text-center">Bonus Codes</span>
                  </motion.button>

                  {/* Telegram */}
                  <motion.a
                    href="https://t.me/+bnV67QwFmCFlMGFh"
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="aspect-square p-4 bg-[#2A2B31]/80 backdrop-blur-sm rounded-xl border border-[#2A2B31]/50 hover:bg-[#2A2B31]/90 transition-all group flex flex-col items-center justify-between"
                  >
                    <div className="flex-1 flex items-center justify-center">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <Send className="w-10 h-10 text-[#D7FF00] drop-shadow-[0_0_8px_rgba(215,255,0,0.3)]" />
                      </motion.div>
                    </div>
                    <span className="text-xs text-[#8A8B91] font-medium text-center">Telegram</span>
                  </motion.a>

                  {/* Support */}
                  <motion.button
                    onClick={handleSupportClick}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="aspect-square p-4 bg-[#2A2B31]/80 backdrop-blur-sm rounded-xl border border-[#2A2B31]/50 hover:bg-[#2A2B31]/90 transition-all group flex flex-col items-center justify-between"
                  >
                    <div className="flex-1 flex items-center justify-center">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: -5 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <MessageCircle className="w-10 h-10 text-[#D7FF00] drop-shadow-[0_0_8px_rgba(215,255,0,0.3)]" />
                      </motion.div>
                    </div>
                    <span className="text-xs text-[#8A8B91] font-medium text-center">Support</span>
                  </motion.button>
                </div>
              </Card>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </>
  );
}