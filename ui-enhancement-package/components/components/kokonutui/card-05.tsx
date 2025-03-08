import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: "default" | "secondary" | "destructive" | "outline" | "goated";
  imageUrl?: string;
  buttonText?: string;
  buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "goated";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  onClick?: () => void;
}

export default function Card05({
  className,
  title = "Premium casino game",
  subtitle = "Experience the ultimate casino action with our premium game selection.",
  badge = "New",
  badgeColor = "goated",
  imageUrl = "https://images.unsplash.com/photo-1519795612147-0f9e638d8900?q=80&w=3276&auto=format&fit=crop",
  buttonText = "Play Now",
  buttonVariant = "goated",
  buttonSize = "default",
  onClick,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700",
        className
      )}
      {...props}
    >
      <div className="flex h-56 flex-col justify-between gap-3 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-medium text-zinc-900 dark:text-zinc-50">
              {title}
            </h3>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              {subtitle}
            </p>
          </div>
          <Badge variant={badgeColor === "goated" ? "default" : 
            (badgeColor as "default" | "destructive" | "outline" | "secondary")} 
            className={badgeColor === "goated" ? "bg-[#D7FF00] text-black" : ""}>
            {badge}
          </Badge>
        </div>
        <div>
          <Button 
            variant={buttonVariant === "goated" ? "default" : buttonVariant} 
            size={buttonSize}
            onClick={onClick}
            className={buttonVariant === "goated" ? "bg-[#D7FF00] text-black hover:bg-[#C8F000]" : ""}
          >
            {buttonText}
          </Button>
        </div>
      </div>
      <div className="relative h-56 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        <img
          src={imageUrl}
          alt={title}
          className="h-full w-full object-cover transition-all duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </div>
  );
}