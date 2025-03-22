import React, { useRef, useState } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { Button, ButtonProps } from "./button";

interface MagneticButtonProps {
  strength?: number;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * MagneticButton - A button that subtly moves toward the cursor when hovering nearby
 */
export function MagneticButton({ 
  children, 
  className = "", 
  strength = 15, 
  onClick,
  ...props 
}: MagneticButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!buttonRef.current) return;
    
    const button = buttonRef.current;
    const rect = button.getBoundingClientRect();
    
    // Calculate center of button
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Calculate distance from mouse to center
    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;
    
    // Calculate movement (closer = stronger effect)
    const magneticPull = strength;
    const moveX = distanceX / magneticPull;
    const moveY = distanceY / magneticPull;
    
    setPosition({ x: moveX, y: moveY });
  };
  
  const handleMouseLeave = () => {
    // Reset position when mouse leaves
    setPosition({ x: 0, y: 0 });
  };
  
  return (
    <motion.div
      ref={buttonRef}
      className={`relative inline-block ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{
        x: position.x,
        y: position.y,
      }}
      transition={{
        type: "spring",
        stiffness: 150,
        damping: 15,
        mass: 0.1
      }}
      onClick={onClick}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface EnhancedButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * EnhancedButton - A button with click feedback animation
 */
export function EnhancedButton({ 
  children, 
  className = "", 
  onClick,
  ...props 
}: EnhancedButtonProps) {
  return (
    <div className={`relative inline-block ${className}`} onClick={onClick} {...props}>
      <Button className="relative">
        {children}
      </Button>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        whileHover={{ scale: 1.05, opacity: 0.2 }}
        whileTap={{ 
          scale: 1.5, 
          opacity: 0,
          transition: { duration: 0.5 } 
        }}
        className="absolute inset-0 bg-[#D7FF00]/20 rounded-lg pointer-events-none"
      />
    </div>
  );
}

interface GlitchButtonProps {
  text: string;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * GlitchButton - A button with a glitch effect
 */
export function GlitchButton({ 
  text, 
  className = "", 
  children, 
  onClick,
  ...props 
}: GlitchButtonProps) {
  return (
    <Button
      className={`enhanced-glitch-button ${className}`}
      data-text={text}
      onClick={onClick}
      {...props}
    >
      {children || text}
    </Button>
  );
}

interface AnimatedBorderButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * AnimatedBorderButton - A button with an animated border effect
 */
export function AnimatedBorderButton({ 
  children, 
  className = "", 
  onClick,
  ...props 
}: AnimatedBorderButtonProps) {
  return (
    <div className="animated-border-card inline-block">
      <Button
        className={`relative z-10 bg-[#1A1B21] ${className}`}
        onClick={onClick}
        {...props}
      >
        {children}
      </Button>
    </div>
  );
}
