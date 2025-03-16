import { Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link } from "wouter";

export function BonusCodeHeroCard() {
  const { isAuthenticated } = useAuth();

  return (
    <Card className={cn(
      "relative overflow-hidden bg-[#1A1B21]/50 backdrop-blur-sm border border-[#2A2B31]",
      !isAuthenticated && "opacity-50 hover:opacity-75 transition-opacity group"
    )}>
      <div className="absolute inset-0 bg-gradient-to-b from-[#D7FF00]/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur-sm" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#D7FF00]">
          Bonus Codes
          {!isAuthenticated && <Lock className="h-4 w-4 text-[#8A8B91]" />}
        </CardTitle>
        <CardDescription className="text-[#8A8B91]">
          {isAuthenticated 
            ? "View and redeem your exclusive bonus codes"
            : "Sign in to access exclusive bonus codes"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isAuthenticated ? (
          <Link href="/bonus-codes">
            <Button variant="default" className="w-full bg-[#D7FF00] text-black hover:bg-[#b2d000]">
              View Bonus Codes
            </Button>
          </Link>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="secondary" 
                  className="w-full bg-[#2A2B31] text-[#8A8B91] cursor-not-allowed"
                  disabled
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Locked
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sign in to access bonus codes and rewards</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}