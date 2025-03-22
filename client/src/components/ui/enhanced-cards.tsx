import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface PremiumCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * PremiumCard - A card with enhanced hover effects
 */
export function PremiumCard({
  children,
  className = "",
  onClick,
  ...props
}: PremiumCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    };
    
    card.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
  
  return (
    <div
      ref={cardRef}
      className={`premium-card ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}

interface AnimatedBorderCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * AnimatedBorderCard - A card with an animated border effect
 */
export function AnimatedBorderCard({
  children,
  className = "",
  onClick,
  ...props
}: AnimatedBorderCardProps) {
  return (
    <div
      className={`animated-border-card ${className}`}
      onClick={onClick}
      {...props}
    >
      <div className="relative z-10 bg-[#1A1B21] p-4 rounded-lg">
        {children}
      </div>
    </div>
  );
}

interface HoverScaleCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  scale?: number;
}

/**
 * HoverScaleCard - A card that scales on hover
 */
export function HoverScaleCard({
  children,
  className = "",
  onClick,
  scale = 1.05,
  ...props
}: HoverScaleCardProps) {
  return (
    <motion.div
      className={`overflow-hidden ${className}`}
      whileHover={{ scale }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      onClick={onClick}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface EnhancedTableRowProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * EnhancedTableRow - A table row with enhanced hover effects
 */
export function EnhancedTableRow({
  children,
  className = "",
  onClick,
  ...props
}: EnhancedTableRowProps) {
  return (
    <tr
      className={`enhanced-table-row ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </tr>
  );
}

interface ShimmerCardProps {
  children: React.ReactNode;
  className?: string;
  isLoading?: boolean;
}

/**
 * ShimmerCard - A card with a shimmer effect for loading states
 */
export function ShimmerCard({
  children,
  className = "",
  isLoading = false,
  ...props
}: ShimmerCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg ${className} ${
        isLoading ? "shimmer" : ""
      }`}
      {...props}
    >
      {children}
    </div>
  );
}
