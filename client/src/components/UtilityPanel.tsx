
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
          <button
            onClick={togglePanel}
            className="w-12 h-12 bg-[#D7FF00] rounded-l-xl flex items-center justify-center hover:bg-[#D7FF00]/90 transition-colors"
          >
            {isOpen ? (
              <X className="w-6 h-6 text-[#14151A]" />
            ) : (
              <Gift className="w-6 h-6 text-[#14151A]" />
            )}
          </button>

          {/* Panel */}
          <Card className="absolute top-0 left-full w-80 bg-[#1A1B21] border-[#2A2B31] rounded-l-xl overflow-hidden">
            <div className="grid grid-cols-2 gap-2 p-4">
              {/* Daily Spin */}
              <button
                onClick={() => setLocation("/wheel-challenge")}
                className="aspect-square p-4 bg-[#2A2B31] rounded-xl hover:bg-[#2A2B31]/80 transition-colors relative group"
              >
                <Gift className={`w-8 h-8 ${isSpinAvailable ? 'text-[#D7FF00]' : 'text-[#8A8B91]'}`} />
                <span className="text-xs text-[#8A8B91] mt-2 block">Daily Spin</span>
                {isSpinAvailable && (
                  <span className="absolute top-2 right-2 h-2 w-2 bg-[#D7FF00] rounded-full" />
                )}
              </button>

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
