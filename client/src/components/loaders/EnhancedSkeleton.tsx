import { cn } from "@/lib/utils";

interface EnhancedSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Specify the skeleton shape
   * @default "rectangle"
   */
  variant?: "rectangle" | "circle" | "text" | "rounded";

  /**
   * Set fixed dimensions, otherwise uses container dimensions
   */
  width?: string | number;
  height?: string | number;

  /**
   * Apply more noticeable shimmer effect
   * @default true
   */
  shimmer?: boolean;
}

/**
 * EnhancedSkeleton
 *
 * Advanced skeleton component with customizable shapes and shimmer effect
 * Used for UI placeholders during component-level data loading
 */
export function EnhancedSkeleton({
  className,
  variant = "rectangle",
  width,
  height,
  shimmer = true,
  ...props
}: EnhancedSkeletonProps) {
  const style: React.CSSProperties = {
    width: width,
    height: height,
  };

  // Configure border radius based on variant
  const variantClasses = {
    rectangle: "rounded-none",
    rounded: "rounded-lg",
    circle: "rounded-full",
    text: "rounded h-4 w-3/4", // Default text line style
  };

  // Combine all classes
  const skeletonClasses = cn(
    "relative overflow-hidden bg-muted/80 animate-pulse",
    shimmer &&
      "after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer after:bg-gradient-to-r after:from-transparent after:via-muted-foreground/10 after:to-transparent",
    variantClasses[variant],
    className,
  );

  return <div className={skeletonClasses} style={style} {...props} />;
}
