import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface CTAProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  primaryButtonText?: string;
  primaryButtonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "goated";
  secondaryButtonText?: string;
  secondaryButtonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "goated";
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
  backgroundImageUrl?: string;
}

export default function CTA01({
  className,
  title = "Ready to Get Started?",
  subtitle = "Join today and start earning rewards with every wager. The ultimate gaming experience is just a click away.",
  primaryButtonText = "Sign Up Now",
  primaryButtonVariant = "goated",
  secondaryButtonText = "Learn More",
  secondaryButtonVariant = "outline",
  onPrimaryClick,
  onSecondaryClick,
  backgroundImageUrl,
  ...props
}: CTAProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden bg-zinc-900 py-16",
        className
      )}
      {...props}
    >
      {backgroundImageUrl && (
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-zinc-900/80" />
          <img
            src={backgroundImageUrl}
            alt="Background"
            className="h-full w-full object-cover opacity-30"
          />
        </div>
      )}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-lg text-zinc-300">
            {subtitle}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              variant={primaryButtonVariant === "goated" ? "default" : primaryButtonVariant}
              size="lg"
              onClick={onPrimaryClick}
              className={primaryButtonVariant === "goated" ? "bg-[#D7FF00] text-black hover:bg-[#C8F000] w-full sm:w-auto" : "w-full sm:w-auto"}
            >
              {primaryButtonText}
            </Button>
            {secondaryButtonText && (
              <Button
                variant={secondaryButtonVariant === "goated" ? "default" : secondaryButtonVariant}
                size="lg"
                onClick={onSecondaryClick}
                className={cn(
                  secondaryButtonVariant === "goated" ? "bg-[#D7FF00] text-black hover:bg-[#C8F000]" : "",
                  secondaryButtonVariant === "outline" ? "border-zinc-700 text-white hover:bg-zinc-800" : "",
                  "w-full sm:w-auto"
                )}
              >
                {secondaryButtonText}
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}