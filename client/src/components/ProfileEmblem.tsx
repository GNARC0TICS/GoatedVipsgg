import React, { useState } from "react";
import { User } from "lucide-react";
import { ColorPicker } from "./ColorPicker";

type ProfileEmblemSize = "sm" | "md" | "lg" | "xl";

interface ProfileEmblemProps {
  username: string;
  color?: string;
  size?: ProfileEmblemSize;
  className?: string;
}

interface ProfileEmblemEditorProps {
  username: string;
  color: string;
  onColorChange: (color: string) => void;
}

// Size mapping for different size variants
const sizeMap = {
  sm: {
    container: "w-8 h-8",
    font: "text-xs",
    icon: "h-3 w-3",
  },
  md: {
    container: "w-10 h-10",
    font: "text-sm",
    icon: "h-4 w-4",
  },
  lg: {
    container: "w-16 h-16",
    font: "text-xl",
    icon: "h-6 w-6",
  },
  xl: {
    container: "w-24 h-24",
    font: "text-3xl",
    icon: "h-8 w-8",
  },
};

// Available colors for the emblem
const availableColors = [
  "#D7FF00", // Neon Yellow (Default)
  "#FF5733", // Coral
  "#33FF57", // Neon Green
  "#3357FF", // Blue
  "#FF33A8", // Pink
  "#33FFF5", // Cyan
  "#A833FF", // Purple
  "#FF3333", // Red
  "#FFAA33", // Orange
  "#33AAFF", // Light Blue
];

export function ProfileEmblem({ 
  username, 
  color = "#D7FF00", 
  size = "md",
  className = "",
}: ProfileEmblemProps) {
  const sizeStyles = sizeMap[size];
  const initial = username ? username.charAt(0).toUpperCase() : "?";
  
  return (
    <div 
      className={`rounded-full flex items-center justify-center ${sizeStyles.container} ${className}`}
      style={{ backgroundColor: color }}
    >
      {username ? (
        <span className={`font-bold text-black ${sizeStyles.font}`}>{initial}</span>
      ) : (
        <User className={`text-black ${sizeStyles.icon}`} />
      )}
    </div>
  );
}

export function ProfileEmblemEditor({ 
  username, 
  color, 
  onColorChange 
}: ProfileEmblemEditorProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <ProfileEmblem 
        username={username} 
        color={color} 
        size="lg" 
      />
      <ColorPicker 
        value={color} 
        onChange={onColorChange} 
        colors={availableColors} 
      />
    </div>
  );
}
