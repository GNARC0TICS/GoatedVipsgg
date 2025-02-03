import { Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
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

export function BonusCodeHeroCard() {
  const { isAuthenticated } = useAuth();

  return (
    <Card className={cn(
      "relative overflow-hidden",
      !isAuthenticated && "opacity-75 hover:opacity-100 transition-opacity"
    )}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Bonus Codes
          {!isAuthenticated && <Lock className="h-4 w-4 text-muted-foreground" />}
        </CardTitle>
        <CardDescription>
          {isAuthenticated 
            ? "View and redeem your exclusive bonus codes"
            : "Sign in to access exclusive bonus codes"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isAuthenticated ? (
          <Button variant="default" className="w-full">
            View Bonus Codes
          </Button>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="secondary" 
                  className="w-full opacity-75"
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
