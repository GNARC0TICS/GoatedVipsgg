
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-mona-sans font-semibold uppercase tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-background hover:bg-primary/90",
        secondary: "border-transparent bg-background-alt text-text-primary hover:bg-border",
        destructive: "border-transparent bg-[#FF3D54] text-white hover:bg-[#FF3D54]/90",
        outline: "border-border text-text-primary hover:bg-background-alt",
        success: "border-transparent bg-[#14B87D] text-white hover:bg-[#14B87D]/90",
        warning: "border-transparent bg-[#FFB800] text-black hover:bg-[#FFB800]/90",
        premium: "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20",
        ghost: "border-transparent bg-transparent text-text-secondary hover:bg-background-alt",
        glass: "border-border/50 bg-background-overlay/30 text-text-primary backdrop-blur-md hover:bg-background-overlay/40",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1 text-sm",
      },
      glow: {
        true: "shadow-[0_0_8px_rgba(215,255,0,0.2)]",
        false: "",
      },
      pill: {
        true: "rounded-full",
        false: "rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      glow: false,
      pill: true,
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
  count?: number | string;
  pulse?: boolean;
}

function Badge({
  className,
  variant,
  size,
  glow,
  pill,
  icon,
  count,
  pulse,
  children,
  ...props
}: BadgeProps) {
  return (
    <div 
      className={cn(
        badgeVariants({ variant, size, glow, pill, className }),
        pulse && "animate-pulse",
      )}
      {...props}
    >
      {icon && <span className="-ml-0.5 flex-shrink-0">{icon}</span>}
      <span>{children}</span>
      {count !== undefined && (
        <span className={cn(
          "flex h-4 min-w-4 items-center justify-center rounded-full bg-background-overlay/50 px-1 text-[10px] leading-none",
          variant === 'default' && "text-text-primary",
          variant === 'premium' && "bg-primary/30",
          variant === 'success' && "bg-[#14B87D]/70 text-white",
          variant === 'warning' && "bg-[#FFB800]/70 text-black",
          variant === 'destructive' && "bg-[#FF3D54]/80 text-white",
        )}>
          {count}
        </span>
      )}
    </div>
  );
}

function TierBadge({
  tier,
  showIcon = true,
  size = "default",
  className,
  ...props
}: {
  tier: "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "VIP" | string;
  showIcon?: boolean;
  size?: VariantProps<typeof badgeVariants>["size"];
  className?: string;
  [key: string]: any;
}) {
  const tierConfig: Record<string, {
    icon: React.ReactNode;
    styles: string;
  }> = {
    "Bronze": {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="#CD7F32">
          <circle cx="12" cy="12" r="10" />
        </svg>
      ),
      styles: "border-[#CD7F32]/30 bg-[#CD7F32]/10 text-[#CD7F32] hover:bg-[#CD7F32]/20"
    },
    "Silver": {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="#C0C0C0">
          <circle cx="12" cy="12" r="10" />
        </svg>
      ),
      styles: "border-[#C0C0C0]/30 bg-[#C0C0C0]/10 text-[#C0C0C0] hover:bg-[#C0C0C0]/20"
    },
    "Gold": {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="#FFD700">
          <circle cx="12" cy="12" r="10" />
        </svg>
      ),
      styles: "border-[#FFD700]/30 bg-[#FFD700]/10 text-[#FFD700] hover:bg-[#FFD700]/20"
    },
    "Platinum": {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="#E5E4E2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ),
      styles: "border-[#E5E4E2]/30 bg-[#E5E4E2]/10 text-[#E5E4E2] hover:bg-[#E5E4E2]/20"
    },
    "Diamond": {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="#B9F2FF">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ),
      styles: "border-[#B9F2FF]/30 bg-gradient-to-r from-[#B9F2FF]/20 to-[#B9F2FF]/5 text-[#B9F2FF] shadow-[0_0_8px_rgba(185,242,255,0.2)]"
    },
    "VIP": {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ),
      styles: "border-primary/30 bg-gradient-to-r from-primary/20 to-primary/5 text-primary shadow-[0_0_8px_rgba(215,255,0,0.15)] font-bold"
    },
  };

  const tierStyle = tierConfig[tier] || {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
    styles: "border-border bg-background-alt text-text-primary"
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 font-mono-sans font-bold uppercase",
        tierStyle.styles,
        badgeVariants({ size, pill: false }),
        className
      )}
      {...props}
    >
      {showIcon && <span className="flex-shrink-0">{tierStyle.icon}</span>}
      <span>{tier}</span>
    </div>
  );
}

function StatusBadge({
  status,
  size = "default",
  className,
  ...props
}: {
  status: "active" | "pending" | "completed" | "failed" | "won" | "lost" | string;
  size?: VariantProps<typeof badgeVariants>["size"];
  className?: string;
  [key: string]: any;
}) {
  const statusConfig: Record<string, {
    variant: VariantProps<typeof badgeVariants>["variant"];
    icon: React.ReactNode;
    label: string;
  }> = {
    "active": {
      variant: "success",
      icon: (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
      ),
      label: "Active"
    },
    "pending": {
      variant: "warning",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      ),
      label: "Pending"
    },
    "completed": {
      variant: "success",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ),
      label: "Completed"
    },
    "failed": {
      variant: "destructive",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ),
      label: "Failed"
    },
    "won": {
      variant: "success",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="7" />
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
        </svg>
      ),
      label: "Won"
    },
    "lost": {
      variant: "secondary",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ),
      label: "Lost"
    },
  };

  const statusData = statusConfig[status.toLowerCase()] || {
    variant: "secondary",
    icon: null,
    label: status
  };

  return (
    <Badge
      variant={statusData.variant}
      size={size}
      icon={statusData.icon}
      className={className}
      {...props}
    >
      {statusData.label}
    </Badge>
  );
}

export { Badge, TierBadge, StatusBadge, badgeVariants };
