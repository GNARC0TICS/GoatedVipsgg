import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-lg border shadow-sm transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-background-card border-border text-text-primary",
        premium: "bg-gradient-to-b from-background-card to-background-card/90 border-primary/30 shadow-[0_4px_20px_rgba(0,0,0,0.2),0_0_0_1px_rgba(215,255,0,0.1)] text-text-primary",
        glass: "glassmorphism backdrop-blur-md shadow-glass border-border/50 text-text-primary",
        highlight: "bg-background-card border-primary border-2 shadow-[0_0_15px_rgba(215,255,0,0.1)] text-text-primary",
        dark: "bg-background border-border/50 text-text-primary",
      },
      interactive: {
        true: "hover:-translate-y-1 hover:shadow-card cursor-pointer active:translate-y-0 active:shadow-sm",
        false: "",
      },
      glowing: {
        true: "hover:shadow-neon animate-pulse-slow",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      interactive: false,
      glowing: false,
    },
    compoundVariants: [
      {
        variant: "premium",
        interactive: true,
        className: "hover:shadow-[0_8px_25px_rgba(0,0,0,0.25),0_0_0_1px_rgba(215,255,0,0.2)]",
      },
      {
        variant: "glass",
        interactive: true,
        className: "hover:bg-background-overlay/80 hover:backdrop-blur-lg",
      },
    ],
  }
);

interface CardProps extends
  React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof cardVariants> {
  clickable?: boolean; // Another way to set interactive
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, interactive, glowing, clickable, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        cardVariants({ 
          variant, 
          interactive: interactive || clickable, 
          glowing,
          className 
        })
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { withBorder?: boolean }
>(({ className, withBorder = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-2 p-6",
      withBorder && "border-b border-border/50 pb-4",
      className
    )}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement> & { 
    accent?: boolean;
    as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  }
>(({ className, accent = false, as: Component = "h3", ...props }, ref) => {
  const Comp = Component as any;
  return (
    <Comp
      ref={ref}
      className={cn(
        "text-xl font-mona-sans font-extrabold leading-none tracking-tight",
        accent && "text-primary",
        className,
      )}
      {...props}
    />
  )
});
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-text-secondary leading-relaxed", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { withBorder?: boolean }
>(({ className, withBorder = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center justify-between gap-4 p-6 pt-0",
      withBorder && "border-t border-border/50 mt-4 pt-4",
      className
    )}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

// NEW: Special Badge Element for Cards
const CardBadge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "success" | "warning" | "premium" | "new";
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variantClasses = {
    default: "bg-background-alt text-text-primary",
    success: "bg-[#14B87D]/10 text-[#14B87D] border-[#14B87D]/30",
    warning: "bg-[#FFB800]/10 text-[#FFB800] border-[#FFB800]/30",
    premium: "bg-primary/10 text-primary border-primary/30",
    new: "bg-[#5E65FF]/10 text-[#7C80F2] border-[#5E65FF]/30",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "absolute top-4 right-4 text-xs font-medium px-2.5 py-1 rounded-md border",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
});
CardBadge.displayName = "CardBadge";

// NEW: Shimmer Card for Loading States
const CardSkeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <Card 
    ref={ref} 
    className={cn("animate-pulse overflow-hidden", className)} 
    {...props}
  >
    <div className="p-6 space-y-4">
      <div className="h-6 w-2/3 bg-border/20 rounded"></div>
      <div className="h-4 w-full bg-border/20 rounded"></div>
      <div className="h-4 w-4/5 bg-border/20 rounded"></div>
      <div className="h-10 w-1/3 bg-border/20 rounded mt-6"></div>
    </div>
  </Card>
));
CardSkeleton.displayName = "CardSkeleton";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  CardBadge,
  CardSkeleton,
  cardVariants,
};
