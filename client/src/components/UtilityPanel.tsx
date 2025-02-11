import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Gift, MessageCircle, Send, Ticket } from "lucide-react";
import { Card } from "@/components/ui/card";
import { FloatingSupport } from "./FloatingSupport";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const UtilityPanelButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSupport, setIsSupport] = useState(false);
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();

  const handleSupportClick = () => {
    setIsSupport(true);
    setIsOpen(false);
  };

  return (
    <>
      {isSupport && <FloatingSupport onClose={() => setIsSupport(false)} />}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 md:h-10 md:w-10 hover:bg-[#D7FF00]/10 focus:outline-none"
          >
            <Gift className="h-5 w-5 text-white hover:text-[#D7FF00]" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className={`${
            isMobile 
              ? "fixed top-16 left-0 right-0 w-full h-[calc(33vh)] transform transition-all duration-300 ease-out border-b border-[#2A2B31]/50 shadow-[0_8px_32px_rgba(0,0,0,0.4)]" 
              : "w-[320px] border border-[#2A2B31]"
          } bg-[#1A1B21]/95 backdrop-blur-xl p-4 ${isMobile ? 'mt-0' : 'mt-2'}`}
        >
          <div className={`grid grid-cols-2 gap-3 relative ${isMobile ? 'h-full' : ''}`}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-1 bg-[#2A2B31] rounded-full opacity-50" />
            <motion.button
              onClick={() => {
                setLocation("/wheel-challenge");
                setIsOpen(false);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`aspect-square p-4 ${isMobile ? 'bg-[#2A2B31]/60' : 'bg-[#2A2B31]/80'} backdrop-blur-sm rounded-xl border border-[#2A2B31]/50 hover:bg-[#2A2B31]/90 transition-all relative group flex flex-col items-center justify-between ${isMobile ? 'active:scale-95' : ''}`}
            >
              <div className="flex-1 flex items-center justify-center">
                <Gift className="w-10 h-10 text-[#D7FF00] drop-shadow-[0_0_8px_rgba(215,255,0,0.3)]" />
              </div>
              <span className="text-xs text-[#8A8B91] font-medium text-center">Daily Spin</span>
            </motion.button>

            <motion.button
              onClick={() => {
                setLocation("/bonus-codes");
                setIsOpen(false);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="aspect-square p-4 bg-[#2A2B31]/80 backdrop-blur-sm rounded-xl border border-[#2A2B31]/50 hover:bg-[#2A2B31]/90 transition-all group flex flex-col items-center justify-between"
            >
              <div className="flex-1 flex items-center justify-center">
                <Ticket className="w-10 h-10 text-[#D7FF00] drop-shadow-[0_0_8px_rgba(215,255,0,0.3)]" />
              </div>
              <span className="text-xs text-[#8A8B91] font-medium text-center">Bonus Codes</span>
            </motion.button>

            <motion.a
              href="https://t.me/+bnV67QwFmCFlMGFh"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="aspect-square p-4 bg-[#2A2B31]/80 backdrop-blur-sm rounded-xl border border-[#2A2B31]/50 hover:bg-[#2A2B31]/90 transition-all group flex flex-col items-center justify-between"
              onClick={() => setIsOpen(false)}
            >
              <div className="flex-1 flex items-center justify-center">
                <Send className="w-10 h-10 text-[#D7FF00] drop-shadow-[0_0_8px_rgba(215,255,0,0.3)]" />
              </div>
              <span className="text-xs text-[#8A8B91] font-medium text-center">Telegram</span>
            </motion.a>

            <motion.button
              onClick={handleSupportClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="aspect-square p-4 bg-[#2A2B31]/80 backdrop-blur-sm rounded-xl border border-[#2A2B31]/50 hover:bg-[#2A2B31]/90 transition-all group flex flex-col items-center justify-between"
            >
              <div className="flex-1 flex items-center justify-center">
                <MessageCircle className="w-10 h-10 text-[#D7FF00] drop-shadow-[0_0_8px_rgba(215,255,0,0.3)]" />
              </div>
              <span className="text-xs text-[#8A8B91] font-medium text-center">Support</span>
            </motion.button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}