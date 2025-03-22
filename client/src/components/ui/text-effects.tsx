import React from "react";
import { motion } from "framer-motion";

interface GradientHeadingProps {
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "span" | "div";
}

/**
 * GradientHeading - A heading with a gradient text effect
 */
export function GradientHeading({
  children,
  className = "",
  as = "h2",
}: GradientHeadingProps) {
  const Component = as;
  
  return (
    <Component className={`gradient-heading ${className}`}>
      {children}
    </Component>
  );
}

interface HighlightTextProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * HighlightText - Text with an animated highlighting effect on hover
 */
export function HighlightText({
  children,
  className = "",
}: HighlightTextProps) {
  return (
    <span className={`highlight-text ${className}`}>
      {children}
    </span>
  );
}

interface TextRevealProps {
  children: string;
  className?: string;
  staggerChildren?: number;
}

/**
 * TextReveal - Animated text reveal effect
 */
export function TextReveal({
  children,
  className = "",
  staggerChildren = 0.03,
}: TextRevealProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren,
          },
        },
      }}
    >
      {children.split("").map((char, index) => (
        <motion.span
          key={`${char}-${index}`}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ display: "inline-block" }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </motion.div>
  );
}

interface ShimmerTextProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * ShimmerText - Text with a shimmer effect
 */
export function ShimmerText({
  children,
  className = "",
}: ShimmerTextProps) {
  return (
    <span className={`relative inline-block ${className}`}>
      {children}
      <span className="absolute inset-0 shimmer pointer-events-none" />
    </span>
  );
}

interface GlitchTextProps {
  children: string;
  className?: string;
}

/**
 * GlitchText - Text with a glitch effect
 */
export function GlitchText({
  children,
  className = "",
}: GlitchTextProps) {
  return (
    <span className={`glitch-text ${className}`} data-text={children}>
      {children}
    </span>
  );
}
