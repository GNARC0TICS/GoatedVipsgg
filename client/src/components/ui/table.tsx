import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  variant?: "default" | "premium" | "glass";
  dense?: boolean;
  hoverable?: boolean;
  striped?: boolean;
}

const tableVariants = cva("w-full caption-bottom text-sm", {
  variants: {
    variant: {
      default: "",
      premium: "border border-border rounded-lg overflow-hidden",
      glass: "glassmorphism rounded-lg overflow-hidden border-none",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, variant, dense, hoverable = true, striped, ...props }, ref) => (
    <div
      className={cn(
        "relative w-full overflow-auto",
        variant === "premium" && "shadow-card",
        variant === "glass" && "shadow-glass rounded-lg",
        className,
      )}
    >
      <table
        ref={ref}
        className={cn(tableVariants({ variant }), className)}
        {...props}
      />
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "[&_tr]:border-b [&_tr]:border-border/50 bg-background-alt/50",
      className,
    )}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement> & {
    striped?: boolean;
    hoverable?: boolean;
  }
>(({ className, striped, hoverable = true, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn(
      "[&_tr:last-child]:border-0",
      striped && "[&_tr:nth-child(even)]:bg-background-alt/30",
      hoverable &&
        "[&_tr:hover]:bg-background-alt/50 [&_tr:hover]:shadow-sm [&_tr]:transition-all [&_tr]:duration-200",
      className,
    )}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t border-border/50 bg-background-alt/50 font-medium [&>tr]:last:border-b-0",
      className,
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  highlighted?: boolean;
  selected?: boolean;
  isHeader?: boolean;
  interactive?: boolean;
}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  (
    { className, highlighted, selected, isHeader, interactive, ...props },
    ref,
  ) => (
    <tr
      ref={ref}
      className={cn(
        "border-b border-border/50 transition-all duration-200",
        !isHeader && "hover:bg-background-alt/50",
        highlighted && "bg-primary/5 hover:bg-primary/10",
        selected && "bg-background-alt/70 hover:bg-background-alt/90",
        interactive &&
          "cursor-pointer hover:-translate-y-[1px] hover:shadow-sm",
        className,
      )}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sorted?: "asc" | "desc" | false;
  sortable?: boolean;
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, sorted, sortable, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-12 px-4 text-left align-middle font-mona-sans font-bold text-sm uppercase tracking-wide text-text-secondary [&:has([role=checkbox])]:pr-0",
        sortable && "cursor-pointer hover:text-text-primary",
        sorted && "text-primary",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-1.5">
        {props.children}
        {sortable && (
          <div className="flex flex-col h-3 w-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={cn(
                "h-3 w-3",
                sorted === "asc"
                  ? "text-primary"
                  : "text-text-muted opacity-50",
              )}
              viewBox="0 0 24 24"
            >
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="m17 8l-5-5l-5 5"
              />
            </svg>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={cn(
                "h-3 w-3",
                sorted === "desc"
                  ? "text-primary"
                  : "text-text-muted opacity-50",
              )}
              viewBox="0 0 24 24"
            >
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="m17 13l-5 5l-5-5"
              />
            </svg>
          </div>
        )}
      </div>
    </th>
  ),
);
TableHead.displayName = "TableHead";

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  highlight?: boolean;
  align?: "left" | "center" | "right";
  truncate?: boolean;
}

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, highlight, align = "left", truncate, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        "p-4 align-middle [&:has([role=checkbox])]:pr-0",
        highlight && "font-medium text-primary",
        align === "center" && "text-center",
        align === "right" && "text-right",
        truncate && "max-w-[150px] truncate",
        className,
      )}
      {...props}
    />
  ),
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-text-secondary", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

// NEW: Indicator for active filters or special status
const TableStatusIndicator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "info" | "warning" | "success" | "error";
    count?: number;
  }
>(({ className, variant = "info", count, children, ...props }, ref) => {
  const variantStyles = {
    info: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    warning: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    success: "bg-green-500/10 text-green-500 border-green-500/20",
    error: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border",
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
      {count !== undefined && (
        <span className="rounded-full bg-background-alt/50 px-1.5 py-0.5 text-xs">
          {count}
        </span>
      )}
    </div>
  );
});
TableStatusIndicator.displayName = "TableStatusIndicator";

// NEW: Table loading skeleton
const TableSkeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    rows?: number;
    columns?: number;
  }
>(({ rows = 5, columns = 4, className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("w-full space-y-3 animate-pulse", className)}
    {...props}
  >
    <div className="flex gap-4 pb-2 border-b border-border/50">
      {Array(columns)
        .fill(null)
        .map((_, i) => (
          <div key={i} className="h-8 bg-border/20 rounded w-28"></div>
        ))}
    </div>

    {Array(rows)
      .fill(null)
      .map((_, i) => (
        <div key={i} className="flex gap-4 py-2">
          {Array(columns)
            .fill(null)
            .map((_, j) => (
              <div key={j} className="h-6 bg-border/20 rounded w-28"></div>
            ))}
        </div>
      ))}
  </div>
));
TableSkeleton.displayName = "TableSkeleton";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TableStatusIndicator,
  TableSkeleton,
};
