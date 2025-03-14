
import React from "react";
import { cn } from "@/lib/utils";

interface ShimmerProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  colorStart?: string;
  colorEnd?: string;
}

export const Shimmer = ({
  className,
  width = "100%",
  height = "16px",
  borderRadius = "4px",
  colorStart = "#2A2B31",
  colorEnd = "#35363D",
}: ShimmerProps) => {
  return (
    <div
      className={cn(
        "relative overflow-hidden",
        className
      )}
      style={{
        width,
        height,
        borderRadius,
        background: colorStart,
      }}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${colorEnd} 50%, transparent 100%)`,
        }}
      />
    </div>
  );
};

interface ShimmerCardProps {
  className?: string;
  rows?: number;
  isHeader?: boolean;
}

export const ShimmerCard = ({ className, rows = 3, isHeader = true }: ShimmerCardProps) => {
  return (
    <div className={cn("p-4 bg-brand-dark rounded-lg border border-brand-light", className)}>
      {isHeader && (
        <div className="flex items-center gap-3 mb-4">
          <Shimmer width={40} height={40} borderRadius="50%" />
          <div className="space-y-2 flex-1">
            <Shimmer width="60%" height={14} />
            <Shimmer width="40%" height={12} />
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Shimmer key={i} height={12} width={`${Math.random() * 40 + 60}%`} />
        ))}
      </div>
    </div>
  );
};
