import * as React from "react";
import { cn } from "@/lib/utils";

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, href, children, ...props }, ref) => {
    return (
      <a
        ref={ref}
        href={href}
        className={cn("text-primary hover:underline", className)}
        {...props}
      >
        {children}
      </a>
    );
  }
);
Link.displayName = "Link";

export { Link };
