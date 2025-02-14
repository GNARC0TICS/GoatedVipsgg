import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Gift, MessageCircle, Send, Ticket } from "lucide-react";
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

  const MobilePanel = () => (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-x-0 top-16 bg-[#1A1B21] border-b border-[#2A2B31]"
    >
      <div className="grid grid-cols-2 gap-3 p-4">
        <motion.button
          onClick={() => {
            setLocation("/wheel-challenge");
            setIsOpen(false);
          }}
          whileTap={{ scale: 0.95 }}
          className="flex flex-col items-center justify-center gap-2 p-4 bg-[#2A2B31]/60 rounded-xl"
        >
          <Gift className="w-8 h-8 text-[#D7FF00]" />
          <span className="text-xs text-[#8A8B91]">Daily Spin</span>
        </motion.button>

        <motion.button
          onClick={() => {
            setLocation("/bonus-codes");
            setIsOpen(false);
          }}
          whileTap={{ scale: 0.95 }}
          className="flex flex-col items-center justify-center gap-2 p-4 bg-[#2A2B31]/60 rounded-xl"
        >
          <Ticket className="w-8 h-8 text-[#D7FF00]" />
          <span className="text-xs text-[#8A8B91]">Bonus Codes</span>
        </motion.button>

        <motion.a
          href="https://t.me/+bnV67QwFmCFlMGFh"
          target="_blank"
          rel="noopener noreferrer"
          whileTap={{ scale: 0.95 }}
          className="flex flex-col items-center justify-center gap-2 p-4 bg-[#2A2B31]/60 rounded-xl"
          onClick={() => setIsOpen(false)}
        >
          <Send className="w-8 h-8 text-[#D7FF00]" />
          <span className="text-xs text-[#8A8B91]">Telegram</span>
        </motion.a>

        <motion.a
          href="https://t.me/xGoombas"
          target="_blank"
          rel="noopener noreferrer"
          whileTap={{ scale: 0.95 }}
          className="flex flex-col items-center justify-center gap-2 p-4 bg-[#2A2B31]/60 rounded-xl"
          onClick={() => setIsOpen(false)}
        >
          <MessageCircle className="w-8 h-8 text-[#D7FF00]" />
          <span className="text-xs text-[#8A8B91]">Support</span>
        </motion.a>
      </div>
    </motion.div>
  );

  const DesktopPanel = () => (
    <DropdownMenuContent
      align="end"
      className="w-[320px] border border-[#2A2B31] bg-[#1A1B21]/95 backdrop-blur-xl p-4 mt-2"
    >
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          onClick={() => {
            setLocation("/wheel-challenge");
            setIsOpen(false);
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="aspect-square p-4 bg-[#2A2B31]/80 backdrop-blur-sm rounded-xl border border-[#2A2B31]/50 hover:bg-[#2A2B31]/90 transition-all relative group flex flex-col items-center justify-between"
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

        <motion.a
          href="https://t.me/xGoombas"
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="aspect-square p-4 bg-[#2A2B31]/80 backdrop-blur-sm rounded-xl border border-[#2A2B31]/50 hover:bg-[#2A2B31]/90 transition-all group flex flex-col items-center justify-between"
          onClick={() => setIsOpen(false)}
        >
          <div className="flex-1 flex items-center justify-center">
            <MessageCircle className="w-10 h-10 text-[#D7FF00] drop-shadow-[0_0_8px_rgba(215,255,0,0.3)]" />
          </div>
          <span className="text-xs text-[#8A8B91] font-medium text-center">Support</span>
        </motion.a>
      </div>
    </DropdownMenuContent>
  );

  return (
    <>
      {isSupport && <FloatingSupport onClose={() => setIsSupport(false)} />}
      {isMobile ? (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            className="relative h-8 w-8 hover:bg-[#D7FF00]/10 focus:outline-none"
          >
            <Gift className="h-5 w-5 text-white hover:text-[#D7FF00]" />
          </Button>
          {isOpen && <MobilePanel />}
        </>
      ) : (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-10 w-10 hover:bg-[#D7FF00]/10 focus:outline-none"
            >
              <Gift className="h-5 w-5 text-white hover:text-[#D7FF00]" />
            </Button>
          </DropdownMenuTrigger>
          <DesktopPanel />
        </DropdownMenu>
      )}
    </>
  );
};