import { Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
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
  const [activeUsers, setActiveUsers] = useState(0);

  useEffect(() => {
    const eventSource = new EventSource('/api/telegram/active-users/stream');
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setActiveUsers(data.count);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="perspective-1000"
    >
      <Card className={cn(
        "relative overflow-hidden bg-[#1A1B21]/50 backdrop-blur-sm border border-[#2A2B31] group hover:border-[#D7FF00]/50 transition-all duration-300",
        !isAuthenticated && "opacity-50 hover:opacity-75 transition-opacity"
      )}>
        <div 
          className="absolute inset-0 w-[200%] transition-all duration-700 bg-gradient-to-r from-transparent via-[#D7FF00]/10 to-transparent -translate-x-full group-hover:translate-x-full"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent, black, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, black, transparent)'
          }}
        />
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-[#D7FF00]">
            <div className="flex items-center gap-2">
              Bonus Codes
              {!isAuthenticated && <Lock className="h-4 w-4 text-[#8A8B91]" />}
            </div>
            <div className="text-sm text-[#8A8B91] flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              {activeUsers} online
            </div>
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
              <Button variant="default" className="w-full bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90 transition-colors duration-300">
                View Bonus Codes
              </Button>
            </Link>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="secondary" 
                    className="w-full bg-[#2A2B31] text-[#8A8B91] cursor-not-allowed hover:bg-[#2A2B31]/80 transition-colors duration-300"
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
    </motion.div>
  );
}