import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Spinner
 *
 * A simple loading spinner with size and color variants
 * Used for smaller UI elements and inline loading states
 */
const spinnerVariants = cva(
  "inline-block animate-spin rounded-full border-solid border-current border-t-transparent",
  {
    variants: {
      size: {
        xs: "h-3 w-3 border",
        sm: "h-4 w-4 border",
        md: "h-6 w-6 border-2",
        lg: "h-8 w-8 border-2",
        xl: "h-12 w-12 border-2",
        "2xl": "h-16 w-16 border-3",
      },
      variant: {
        default: "text-primary",
        muted: "text-muted-foreground",
        brand: "text-[#D7FF00]",
        white: "text-white",
      },
    },
    defaultVariants: {
      size: "md",
      variant: "brand",
    },
  },
);

interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  /**
   * Optional text to display next to the spinner
   */
  text?: string;

  /**
   * Whether to center the spinner horizontally
   * @default false
   */
  centered?: boolean;
}

export function Spinner({
  className,
  size,
  variant,
  text,
  centered = false,
  ...props
}: SpinnerProps) {
  const containerClasses = cn(
    "flex items-center gap-2",
    centered && "justify-center",
    className,
  );

  return (
    <div className={containerClasses} {...props}>
      <div
        className={spinnerVariants({ size, variant })}
        role="status"
        aria-label="Loading"
      >
        <span className="sr-only">Loading</span>
      </div>
      {text && (
        <span
          className={cn(
            "text-sm font-medium",
            variant === "brand"
              ? "text-[#D7FF00]"
              : variant === "white"
                ? "text-white"
                : variant === "muted"
                  ? "text-muted-foreground"
                  : "text-foreground",
          )}
        >
          {text}
        </span>
      )}
    </div>
  );
}
