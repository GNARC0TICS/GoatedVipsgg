
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  neonIntensity?: "low" | "medium" | "high";
}

const NeonButton = React.forwardRef<HTMLButtonElement, NeonButtonProps>(
  ({ 
    className, 
    children, 
    variant = "default", 
    size = "md", 
    isLoading = false,
    neonIntensity = "medium",
    ...props 
  }, ref) => {
    const neonGlowMap = {
      low: "0 0 5px rgba(215, 255, 0, 0.3), 0 0 10px rgba(215, 255, 0, 0.2)",
      medium: "0 0 10px rgba(215, 255, 0, 0.5), 0 0 20px rgba(215, 255, 0, 0.3)",
      high: "0 0 15px rgba(215, 255, 0, 0.7), 0 0 30px rgba(215, 255, 0, 0.5), 0 0 45px rgba(215, 255, 0, 0.3)"
    };
    
    const sizeClasses = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg"
    };
    
    const variantClasses = {
      default: "bg-brand-yellow text-brand-dark hover:bg-opacity-90",
      outline: "bg-transparent border-2 border-brand-yellow text-brand-yellow hover:bg-brand-yellow hover:bg-opacity-10",
      ghost: "bg-transparent text-brand-yellow hover:bg-brand-yellow hover:bg-opacity-10"
    };
    
    return (
      <motion.button
        ref={ref}
        className={cn(
          "relative font-heading uppercase rounded transition-all duration-300 font-semibold",
          sizeClasses[size],
          variantClasses[variant],
          "hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:ring-opacity-50",
          { "opacity-80 cursor-not-allowed": props.disabled },
          { "animate-pulse": isLoading },
          className
        )}
        whileTap={{ scale: 0.98 }}
        whileHover={{
          boxShadow: neonGlowMap[neonIntensity],
          transition: { duration: 0.2 }
        }}
        {...props}
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            <span>Loading...</span>
          </div>
        ) : (
          children
        )}
      </motion.button>
    );
  }
);

NeonButton.displayName = "NeonButton";

export { NeonButton };
