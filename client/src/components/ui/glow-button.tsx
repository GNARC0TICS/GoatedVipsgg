
import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const glowButtonVariants = cva(
  "relative inline-flex items-center justify-center overflow-hidden rounded-md font-heading font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-primary to-primary/80 text-black hover:shadow-[0_0_20px_rgba(215,255,0,0.5)] active:scale-[0.98]",
        outline:
          "border border-primary bg-transparent text-primary hover:bg-primary/10 hover:shadow-[0_0_15px_rgba(215,255,0,0.3)]",
        ghost:
          "bg-transparent text-primary hover:bg-primary/10",
        glow:
          "bg-black border border-primary text-primary shadow-[0_0_20px_rgba(215,255,0,0.5)] hover:shadow-[0_0_30px_rgba(215,255,0,0.8)] hover:border-primary/80"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-sm",
        lg: "h-12 px-6 text-lg",
        xl: "h-14 px-8 text-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface GlowButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof glowButtonVariants> {
  asChild?: boolean;
}

const GlowButton = React.forwardRef<HTMLButtonElement, GlowButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(glowButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
GlowButton.displayName = "GlowButton";

export { GlowButton, glowButtonVariants };
