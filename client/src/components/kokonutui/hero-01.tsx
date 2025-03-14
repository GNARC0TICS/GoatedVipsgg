import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface HeroProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "goated";
  secondaryButtonText?: string;
  secondaryButtonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "goated";
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
  backgroundImageUrl?: string;
}

export default function Hero01({
  className,
  title = "Your Ultimate Gaming Experience",
  subtitle = "Join thousands of players in the most rewarding gaming platform with daily wager races and exclusive rewards.",
  buttonText = "Get Started",
  buttonVariant = "goated",
  secondaryButtonText = "Learn More",
  secondaryButtonVariant = "outline",
  onPrimaryClick,
  onSecondaryClick,
  backgroundImageUrl = "https://images.unsplash.com/photo-1615236237404-5b756250c1db?q=80&w=3270&auto=format&fit=crop",
  ...props
}: HeroProps) {
  return (
    <section
      className={cn(
        "relative flex min-h-[560px] flex-col items-center justify-center overflow-hidden bg-zinc-900 px-4 py-16",
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
            className="h-full w-full object-cover opacity-50"
          />
        </div>
      )}
      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center justify-center text-center">
        <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-white md:text-5xl lg:text-6xl">
          {title}
        </h1>
        <p className="mb-8 max-w-3xl text-lg text-zinc-300">
          {subtitle}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button
            variant={buttonVariant === "goated" ? "default" : buttonVariant}
            size="lg"
            onClick={onPrimaryClick}
            className={buttonVariant === "goated" ? "bg-[#D7FF00] text-black hover:bg-[#C8F000]" : ""}
          >
            {buttonText}
          </Button>
          {secondaryButtonText && (
            <Button
              variant={secondaryButtonVariant === "goated" ? "default" : secondaryButtonVariant}
              size="lg"
              onClick={onSecondaryClick}
              className={secondaryButtonVariant === "goated" ? "bg-[#D7FF00] text-black hover:bg-[#C8F000]" : ""}
            >
              {secondaryButtonText}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}