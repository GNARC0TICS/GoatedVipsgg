
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Gift, MessageCircle, Send, Ticket, Timer, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { FloatingSupport } from "./FloatingSupport";

export function UtilityPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSupport, setIsSupport] = useState(false);
  const [, setLocation] = useLocation();
  const [timeLeft] = useState<string>("Available now!");
  const isSpinAvailable = true; // For testing purposes

  const togglePanel = () => setIsOpen(!isOpen);
  
  const handleSupportClick = () => {
    setIsSupport(true);
    setIsOpen(false);
  };

  return (
    <>
      {isSupport && <FloatingSupport onClose={() => setIsSupport(false)} />}
      <motion.div 
        className="fixed right-4 top-20 z-50"
        initial={{ x: 100 }}
        animate={{ x: 0 }}
        transition={{ type: "spring", duration: 0.8 }}
      >
        <motion.div
          className="relative"
          animate={{ x: isOpen ? -320 : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
        >
          {/* Toggle Button */}
          <motion.button
            onClick={togglePanel}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 bg-[#D7FF00] rounded-l-xl flex items-center justify-center hover:bg-[#D7FF00]/90 transition-all shadow-[0_0_15px_rgba(215,255,0,0.3)] hover:shadow-[0_0_20px_rgba(215,255,0,0.5)]"
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
          <Card className="absolute top-0 left-full w-80 bg-[#1A1B21]/80 backdrop-blur-md border border-[#2A2B31]/50 rounded-l-xl overflow-hidden shadow-[0_0_25px_rgba(42,43,49,0.3)] hover:shadow-[0_0_30px_rgba(42,43,49,0.4)] transition-all">
            <div className="grid grid-cols-2 gap-3 p-4">
              {/* Daily Spin */}
              <motion.button
                onClick={() => setLocation("/wheel-challenge")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="aspect-square p-4 bg-[#2A2B31]/80 backdrop-blur-sm rounded-xl border border-[#2A2B31]/50 hover:bg-[#2A2B31]/90 transition-all relative group shadow-[0_0_15px_rgba(42,43,49,0.2)] hover:shadow-[0_0_20px_rgba(42,43,49,0.3)]"
              >
                <motion.div
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Gift className={`w-8 h-8 ${isSpinAvailable ? 'text-[#D7FF00] drop-shadow-[0_0_8px_rgba(215,255,0,0.3)]' : 'text-[#8A8B91]'}`} />
                  <span className="text-xs text-[#8A8B91] mt-2 block font-medium">Daily Spin</span>
                </motion.div>
                {isSpinAvailable && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 h-2 w-2 bg-[#D7FF00] rounded-full shadow-[0_0_8px_rgba(215,255,0,0.5)]" 
                  />
                )}
              </motion.button>

              {/* Bonus Codes */}
              <button
                onClick={() => setLocation("/bonus-codes")}
                className="aspect-square p-4 bg-[#2A2B31] rounded-xl hover:bg-[#2A2B31]/80 transition-colors group"
              >
                <Ticket className="w-8 h-8 text-[#D7FF00] group-hover:scale-110 transition-transform" />
                <span className="text-xs text-[#8A8B91] mt-2 block">Bonus Codes</span>
              </button>

              {/* Telegram */}
              <a
                href="https://t.me/xGoombas"
                target="_blank"
                rel="noopener noreferrer"
                className="aspect-square p-4 bg-[#2A2B31] rounded-xl hover:bg-[#2A2B31]/80 transition-colors group"
              >
                <Send className="w-8 h-8 text-[#D7FF00] group-hover:scale-110 transition-transform" />
                <span className="text-xs text-[#8A8B91] mt-2 block">Telegram</span>
              </a>

              {/* Support */}
              <button
                onClick={handleSupportClick}
                className="aspect-square p-4 bg-[#2A2B31] rounded-xl hover:bg-[#2A2B31]/80 transition-colors group"
              >
                <MessageCircle className="w-8 h-8 text-[#D7FF00] group-hover:scale-110 transition-transform" />
                <span className="text-xs text-[#8A8B91] mt-2 block">Support</span>
              </button>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </>
  );
}
