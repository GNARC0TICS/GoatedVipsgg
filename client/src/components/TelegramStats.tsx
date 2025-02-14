import { useState, useEffect } from "react";
import { Loader2, Users } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function TelegramStats() {
  const [activeUsers, setActiveUsers] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const eventSource = new EventSource('/api/telegram/active-users/stream');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setActiveUsers(data.count);
        setError(null);
      } catch (err) {
        setError('Failed to parse data');
      }
      setIsLoading(false);
    };

    eventSource.onerror = () => {
      setError('Failed to connect to server');
      setIsLoading(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-[#8A8B91] text-sm">
        <Loader2 className="h-3 w-3 animate-spin" />
        Connecting...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-[#8A8B91] text-sm">
        <Users className="h-4 w-4" />
        Join our community
      </div>
    );
  }

  if (activeUsers === null) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse mt-[2px]" />
            <span className="text-[#8A8B91]">
              <strong className="text-white">
                {activeUsers.toLocaleString()}
              </strong>{' '}
              members online
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Real-time members in our Telegram community</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}