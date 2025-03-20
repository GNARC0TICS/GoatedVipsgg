import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react"; // Added for close button icon


export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-8 left-8 z-50" // Changed to bottom left
        >
          <Button
            onClick={scrollToTop}
            size="icon"
            className="rounded-full bg-[#D7FF00] hover:bg-[#D7FF00]/80 text-black"
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hypothetical Support Widget with Close Button
export function SupportWidget() {
  const [isOpen, setIsOpen] = useState(true);

  const closeWidget = () => {
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed top-4 left-4 bg-white p-4 rounded shadow">
          <Button onClick={closeWidget} size="icon" className="absolute top-2 left-2">
            <X className="h-4 w-4" />
          </Button>
          {/* Support widget content */}
          <p>Support content here</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


//Hypothetical RaceTimer Widget with Close Button
export function RaceTimerWidget() {
    const [isOpen, setIsOpen] = useState(true);

    const closeWidget = () => {
      setIsOpen(false);
    };

    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div className="fixed top-4 right-4 bg-[#1A1B21]/90 backdrop-blur-sm border border-[#2A2B31] rounded-lg p-2">
            <Button onClick={closeWidget} size="icon" className="absolute top-2 right-2 bg-[#1A1B21]/90 backdrop-blur-sm border border-[#2A2B31] rounded-lg p-2 cursor-pointer hover:bg-[#1A1B21] transition-all duration-200">
              <X className="h-4 w-4 text-white" />
            </Button>
            {/* Race timer content */}
            <p>Race Timer here</p>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }