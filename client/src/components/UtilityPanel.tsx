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

interface PanelItem {
  label: string;
  icon: React.ElementType;
  onClick?: () => void;
  href?: string;
}

export const UtilityPanelButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSupport, setIsSupport] = useState(false);
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();

  const handleNavigation = (path: string) => {
    setLocation(path);
    setIsOpen(false);
  };

  const handleSupportClick = () => {
    setIsSupport(true);
    setIsOpen(false);
  };

  // Define your panel items (adjust the support item as needed)
  const items: PanelItem[] = [
    {
      label: "Daily Spin",
      icon: Gift,
      onClick: () => handleNavigation("/wheel-challenge"),
    },
    {
      label: "Bonus Codes",
      icon: Ticket,
      onClick: () => handleNavigation("/bonus-codes"),
    },
    {
      label: "Telegram",
      icon: Send,
      href: "https://t.me/+bnV67QwFmCFlMGFh",
    },
    {
      label: "Support",
      icon: MessageCircle,
      onClick: handleSupportClick,
      // Alternatively, if you prefer an external link:
      // href: "https://t.me/xGoombas",
    },
  ];

  // Helper to render a panel item for mobile or desktop
  const renderItem = (item: PanelItem, variant: "mobile" | "desktop") => {
    const Icon = item.icon;
    const commonClasses =
      variant === "mobile"
        ? "flex flex-col items-center justify-center gap-2 p-4 bg-[#2A2B31]/60 rounded-xl"
        : "aspect-square p-4 bg-[#2A2B31]/80 backdrop-blur-sm rounded-xl border border-[#2A2B31]/50 hover:bg-[#2A2B31]/90 transition-all group flex flex-col items-center justify-between";
    const iconSize = variant === "mobile" ? "w-8 h-8" : "w-10 h-10 drop-shadow-[0_0_8px_rgba(215,255,0,0.3)]";
    const textClasses =
      variant === "mobile"
        ? "text-xs text-[#8A8B91]"
        : "text-xs text-[#8A8B91] font-medium text-center";

    const motionProps = {
      whileTap: { scale: 0.95 },
      ...(variant === "desktop" && { whileHover: { scale: 1.05 } }),
    };

    if (item.href) {
      return (
        <motion.a
          key={item.label}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setIsOpen(false)}
          className={commonClasses}
          {...motionProps}
        >
          <div className="flex-1 flex items-center justify-center">
            <Icon className={`${iconSize} text-[#D7FF00]`} />
          </div>
          <span className={textClasses}>{item.label}</span>
        </motion.a>
      );
    } else {
      return (
        <motion.button
          key={item.label}
          onClick={item.onClick}
          className={commonClasses}
          {...motionProps}
        >
          <div className="flex-1 flex items-center justify-center">
            <Icon className={`${iconSize} text-[#D7FF00]`} />
          </div>
          <span className={textClasses}>{item.label}</span>
        </motion.button>
      );
    }
  };

  // Mobile version panel
  const MobilePanel = () => (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-x-0 top-16 bg-[#1A1B21] border-b border-[#2A2B31]"
    >
      <div className="grid grid-cols-2 gap-3 p-4">
        {items.map((item) => renderItem(item, "mobile"))}
      </div>
    </motion.div>
  );

  // Desktop version panel
  const DesktopPanel = () => (
    <DropdownMenuContent
      align="end"
      className="w-[320px] border border-[#2A2B31] bg-[#1A1B21]/95 backdrop-blur-xl p-4 mt-2"
    >
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => renderItem(item, "desktop"))}
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
            onClick={() => setIsOpen((prev) => !prev)}
            className="relative h-8 w-8 hover:bg-[#D7FF00]/10 focus:outline-none"
            aria-label="Open Utility Panel"
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
              aria-label="Open Utility Panel"
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
