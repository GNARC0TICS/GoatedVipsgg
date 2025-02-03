import { cn } from "@/lib/utils";
import { Link } from "wouter";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import { requiresAuth } from "@/lib/auth";

interface NavItemProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function NavItem({ href, children, className, onClick }: NavItemProps) {
  const { isAuthenticated } = useAuth();
  const requiresAuthAccess = requiresAuth(href);
  const isDisabled = requiresAuthAccess && !isAuthenticated;

  const content = (
    <Link href={isDisabled ? "#" : href}>
      <a
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md transition-colors",
          isDisabled && "opacity-50 cursor-not-allowed",
          className
        )}
        onClick={(e) => {
          if (isDisabled) {
            e.preventDefault();
          } else if (onClick) {
            onClick();
          }
        }}
      >
        {children}
      </a>
    </Link>
  );

  if (isDisabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent>
            <p>Sign in to access bonus codes and rewards</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}
