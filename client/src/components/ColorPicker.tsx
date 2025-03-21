import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  colors?: string[];
}

// Default color palette
const defaultColors = [
  "#D7FF00", // Neon Yellow (Brand color)
  "#FF5E5B", // Coral Red
  "#00A3FF", // Bright Blue
  "#FF00E5", // Magenta
  "#00FFA3", // Mint Green
  "#FFB800", // Amber
  "#9D4EDD", // Purple
  "#FF3D00", // Orange
  "#00FFFF", // Cyan
  "#FF00A0", // Pink
];

export function ColorPicker({ 
  value, 
  onChange, 
  colors = defaultColors 
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group w-10 h-10 rounded-full border-2 border-[#2A2B31] hover:border-[#3A3B41] flex items-center justify-center overflow-hidden transition-all duration-300 shadow-md hover:shadow-lg relative"
        style={{ backgroundColor: value }}
        aria-label="Select color"
      >
        {/* Subtle inner highlight */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
        
        {/* Subtle hover effect */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 rounded-full" />
        
        {/* Dropdown indicator */}
        <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <ChevronDown className="h-4 w-4 text-[#8A8B91]" />
        </div>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute top-full left-0 mt-3 p-3 bg-[#1A1B21]/95 backdrop-blur-md border border-[#2A2B31] rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3)] z-50"
          >
            <div className="grid grid-cols-5 gap-2.5">
              {colors.map((color, index) => (
                <motion.button
                  key={color}
                  type="button"
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#D7FF00]/50 relative ${
                    value === color ? "ring-2 ring-white shadow-lg" : "hover:shadow-md"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    onChange(color);
                    setIsOpen(false);
                  }}
                  aria-label={`Select color ${color}`}
                  whileHover={{ 
                    scale: 1.15,
                    boxShadow: `0 0 12px ${color}80`
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ 
                    duration: 0.3, 
                    delay: 0.05 + (index * 0.02),
                    type: "spring",
                    stiffness: 300,
                    damping: 20
                  }}
                >
                  {value === color && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    >
                      <div className="bg-white/20 rounded-full p-1">
                        <Check className="h-4 w-4 text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.5)]" />
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Subtle inner highlight */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-full pointer-events-none" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
