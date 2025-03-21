import React, { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  colors: string[];
}

export function ColorPicker({ value, onChange, colors }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* Color picker trigger */}
      <button
        type="button"
        className="w-8 h-8 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform duration-200"
        style={{ backgroundColor: value }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open color picker"
      />

      {/* Color picker dropdown */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 p-2 bg-[#1A1B21]/95 backdrop-blur-xl border border-[#2A2B31] rounded-lg shadow-xl z-50 grid grid-cols-5 gap-2">
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-200",
                value === color && "ring-2 ring-white"
              )}
              style={{ backgroundColor: color }}
              onClick={() => {
                onChange(color);
                setIsOpen(false);
              }}
              aria-label={`Select color ${color}`}
            >
              {value === color && (
                <Check className="h-3 w-3 text-white stroke-[3]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
