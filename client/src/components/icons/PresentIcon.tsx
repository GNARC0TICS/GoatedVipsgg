import React from "react";

interface Present3DIconProps {
  size?: number;
  color?: string;
  hasNotification?: boolean;
}

export function Present3DIcon({ 
  size = 24, 
  color = "#FFFFFF",
  hasNotification = false 
}: Present3DIconProps) {
  return (
    <div className="relative">
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Base of the present */}
        <path
          d="M3 8h18v12a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
          fill="#1A1B21"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        
        {/* Top of the present */}
        <path
          d="M2 5a1 1 0 011-1h18a1 1 0 011 1v3H2V5z"
          fill="#1A1B21"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        
        {/* Ribbon vertical */}
        <path
          d="M12 4v18"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        
        {/* Ribbon horizontal */}
        <path
          d="M3 12h18"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        
        {/* Bow left */}
        <path
          d="M7.5 4C7.5 2.5 9 1 12 2"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        
        {/* Bow right */}
        <path
          d="M16.5 4C16.5 2.5 15 1 12 2"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      
      {/* Notification indicator */}
      {hasNotification && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse">
          <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
        </div>
      )}
    </div>
  );
}
