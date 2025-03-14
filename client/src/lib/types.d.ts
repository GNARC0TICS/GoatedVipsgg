// UI Component Types
declare module "@/components/ui/card" {
  import { FC, HTMLAttributes } from "react";

  export interface CardProps extends HTMLAttributes<HTMLDivElement> {}
  export const Card: FC<CardProps>;
  export const CardHeader: FC<CardProps>;
  export const CardTitle: FC<CardProps>;
  export const CardDescription: FC<CardProps>;
  export const CardContent: FC<CardProps>;
  export const CardFooter: FC<CardProps>;
}

declare module "@/components/ui/button" {
  import { ButtonHTMLAttributes, ForwardRefExoticComponent, RefAttributes } from "react";

  export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
    asChild?: boolean;
  }

  export const Button: ForwardRefExoticComponent<ButtonProps & RefAttributes<HTMLButtonElement>>;
}

declare module "@/components/ui/input" {
  import { InputHTMLAttributes, ForwardRefExoticComponent, RefAttributes } from "react";

  export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    asChild?: boolean;
  }

  export const Input: ForwardRefExoticComponent<InputProps & RefAttributes<HTMLInputElement>>;
}

declare module "@/components/ui/textarea" {
  import { TextareaHTMLAttributes, FC } from "react";

  export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}
  export const Textarea: FC<TextareaProps>;
}

declare module "@/components/ui/table" {
  import { FC, HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

  export interface TableProps extends HTMLAttributes<HTMLTableElement> {}
  export interface TableHeaderProps extends HTMLAttributes<HTMLTableSectionElement> {}
  export interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {}
  export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {}
  export interface TableHeadProps extends ThHTMLAttributes<HTMLTableHeaderCellElement> {}
  export interface TableCellProps extends TdHTMLAttributes<HTMLTableDataCellElement> {}

  export const Table: FC<TableProps>;
  export const TableHeader: FC<TableHeaderProps>;
  export const TableBody: FC<TableBodyProps>;
  export const TableRow: FC<TableRowProps>;
  export const TableHead: FC<TableHeadProps>;
  export const TableCell: FC<TableCellProps>;
}

declare module "@/components/ui/badge" {
  import { FC, HTMLAttributes } from "react";

  export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "secondary" | "destructive" | "outline";
  }
  export const Badge: FC<BadgeProps>;
}

declare module "@/components/ui/switch" {
  import { FC, InputHTMLAttributes } from "react";

  export interface SwitchProps extends InputHTMLAttributes<HTMLInputElement> {
    onCheckedChange?: (checked: boolean) => void;
  }
  export const Switch: FC<SwitchProps>;
}

declare module "@/components/ui/separator" {
  import { HTMLAttributes, ForwardRefExoticComponent, RefAttributes } from "react";

  export interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
    orientation?: "horizontal" | "vertical";
    decorative?: boolean;
  }

  export const Separator: ForwardRefExoticComponent<SeparatorProps & RefAttributes<HTMLDivElement>>;
}

declare module "@/components/ui/sheet" {
  import { FC, HTMLAttributes } from "react";

  export interface SheetProps extends HTMLAttributes<HTMLDivElement> {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }
  export interface SheetContentProps extends HTMLAttributes<HTMLDivElement> {
    side?: "top" | "right" | "bottom" | "left";
  }

  export const Sheet: FC<SheetProps>;
  export const SheetContent: FC<SheetContentProps>;
}

declare module "@/components/ui/skeleton" {
  import { FC, HTMLAttributes } from "react";

  export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {}
  export const Skeleton: FC<SkeletonProps>;
}

declare module "@/components/ui/tooltip" {
  import { HTMLAttributes, ForwardRefExoticComponent, RefAttributes, ReactNode } from "react";

  export interface TooltipProviderProps {
    children: ReactNode;
    delayDuration?: number;
    skipDelayDuration?: number;
    disableHoverableContent?: boolean;
  }

  export interface TooltipProps extends HTMLAttributes<HTMLDivElement> {
    delayDuration?: number;
  }

  export interface TooltipContentProps extends HTMLAttributes<HTMLDivElement> {
    side?: "top" | "right" | "bottom" | "left";
    align?: "start" | "center" | "end";
    arrowPadding?: number;
    sticky?: "partial" | "always";
  }

  export const Tooltip: ForwardRefExoticComponent<TooltipProps & RefAttributes<HTMLDivElement>>;
  export const TooltipContent: ForwardRefExoticComponent<TooltipContentProps & RefAttributes<HTMLDivElement>>;
  export const TooltipProvider: React.FC<TooltipProviderProps>;
  export const TooltipTrigger: ForwardRefExoticComponent<HTMLAttributes<HTMLElement> & { asChild?: boolean } & RefAttributes<HTMLElement>>;
}

declare module "@/hooks/use-toast" {
  export interface ToastProps {
    title?: string;
    description?: string;
    variant?: "default" | "destructive";
  }

  export function useToast(): {
    toast: (props: ToastProps) => void;
  };
}

declare module "@/components/LoadingSpinner" {
  import { FC } from "react";
  export const LoadingSpinner: FC;
}

declare module "@/hooks/use-leaderboard" {
  export type TimePeriod = "today" | "weekly" | "monthly" | "all_time";
  export function useLeaderboard(period: TimePeriod): {
    data: any[];
    isLoading: boolean;
    error: Error | null;
  };
}

declare module "@/components/LeaderboardTable" {
  import { FC } from "react";
  import { TimePeriod } from "@/hooks/use-leaderboard";

  export interface LeaderboardTableProps {
    timePeriod: TimePeriod;
  }
  export const LeaderboardTable: FC<LeaderboardTableProps>;
}

declare module "@/hooks/use-mobile" {
  export function useIsMobile(): boolean;
}

declare module "@/hooks/use-user" {
  export interface User {
    id: string;
    username: string;
    email: string;
    isAdmin: boolean;
  }

  export function useUser(): {
    user: User | null;
    loading: boolean;
    error: Error | null;
    logout: () => Promise<void>;
  };
}

declare module "@/lib/utils" {
  export function cn(...inputs: (string | undefined | null | false)[]): string;
}

// Adding PageTransition component type declaration
declare module "@/components/PageTransition" {
  import { FC, ReactNode } from "react";

  export interface PageTransitionProps {
    children: ReactNode;
    isLoading?: boolean;
  }

  export const PageTransition: FC<PageTransitionProps>;
}