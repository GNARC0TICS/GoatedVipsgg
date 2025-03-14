import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-mona-sans font-extrabold uppercase tracking-tight ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-300 hover:[&_svg]:translate-x-0.5",
  {
    variants: {
      variant: {
        default: 
          "fill-animation text-[#14151A] bg-primary hover:text-primary hover:shadow-[0_0_10px_rgba(215,255,0,0.3)] active:shadow-none active:scale-[0.98]",
        destructive:
          "bg-[#FF3D54] text-white hover:bg-[#E83249] hover:shadow-[0_0_10px_rgba(255,61,84,0.2)] active:shadow-none active:scale-[0.98]",
        outline:
          "border-2 border-border bg-transparent text-text-primary hover:border-primary hover:text-primary hover:shadow-[0_0_8px_rgba(215,255,0,0.15)] active:shadow-none",
        secondary:
          "bg-background-alt text-text-primary hover:bg-[#22232A] hover:shadow-card active:shadow-none active:scale-[0.98]",
        glass: 
          "glassmorphism text-white backdrop-blur-md hover:bg-background-overlay/90 hover:shadow-glass active:shadow-sm active:scale-[0.98]",
        ghost: 
          "text-text-primary hover:bg-background-alt hover:text-text-accent hover:shadow-sm active:shadow-none",
        link: 
          "text-primary p-0 h-auto hover:text-primary/80 hover:underline underline-offset-4 after:content-['→'] after:ml-1 after:opacity-0 after:transition-all hover:after:opacity-100 hover:after:translate-x-1",
        premium: 
          "bg-gradient-to-r from-primary to-primary/90 text-background shadow-neon text-[#14151A] hover:shadow-neon-strong hover:scale-[1.02] active:scale-[0.98] active:shadow-neon",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8 text-base",
        xl: "h-12 rounded-md px-10 text-base",
        icon: "h-10 w-10",
      },
      glow: {
        true: "hover:animate-glow",
        false: "",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      glow: false,
    },
    compoundVariants: [
      {
        variant: "premium",
        glow: true,
        className: "animate-glow"
      },
    ]
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, glow, asChild = false, leftIcon, rightIcon, isLoading, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, glow, className }))}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        )}
        {!isLoading && leftIcon && <span className="icon-left">{leftIcon}</span>}
        <span className="relative z-10">{children}</span>
        {!isLoading && rightIcon && <span className="icon-right">{rightIcon}</span>}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
