// This file contains component-specific types that are not shared across the application.
// Shared types have been moved to @/types/api.ts

import { ReactNode } from "react";
import { LeaderboardEntry, TimePeriod } from "@/types/api";

// Props for components that accept children
export interface WithChildrenProps {
  children: ReactNode;
}

// Props for components that can be disabled
export interface DisableableProps {
  disabled?: boolean;
}

// Props for components that can have custom CSS classes
export interface WithClassNameProps {
  className?: string;
}

// Props for components that can have a ref
export interface WithRefProps<T> {
  ref?: React.RefObject<T>;
}

// Props for components that can have an ID
export interface WithIdProps {
  id?: string;
}

// Props for components that can have ARIA labels
export interface WithAriaProps {
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
}

// Props for components that can have a test ID
export interface WithTestIdProps {
  "data-testid"?: string;
}

// Props for components that can have a loading state
export interface WithLoadingProps {
  isLoading?: boolean;
}

// Props for the LoadingSpinner component
export interface LoadingSpinnerProps extends WithLoadingProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'secondary';
  className?: string;
}

// Props for the LeaderboardTable component
export interface LeaderboardTableProps extends WithLoadingProps, WithErrorProps {
  data: LeaderboardEntry[];
  period: TimePeriod;
  className?: string;
}

// Props for the QuickProfile component
export interface QuickProfileProps extends WithChildrenProps {
  userId: string;
  username: string;
  className?: string;
}

// Props for components that can have an error state
export interface WithErrorProps {
  error?: Error | null;
  onError?: (error: Error) => void;
}

// Props for components that can be styled with variants
export interface WithVariantProps<T extends string> {
  variant?: T;
}

// Props for components that can be sized
export interface WithSizeProps<T extends string> {
  size?: T;
}

// Props for components that can have a color scheme
export interface WithColorSchemeProps<T extends string> {
  colorScheme?: T;
}

// Props for components that can have an icon
export interface WithIconProps {
  icon?: ReactNode;
  iconPosition?: "left" | "right";
}

// Props for components that can have a tooltip
export interface WithTooltipProps {
  tooltip?: string;
  tooltipPlacement?: "top" | "right" | "bottom" | "left";
}

// Props for components that can be animated
export interface WithAnimationProps {
  animate?: boolean;
  animationDuration?: number;
}
