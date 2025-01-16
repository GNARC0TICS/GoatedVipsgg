import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

type LeaderboardEntry = {
  uid: string;
  name: string;
  wagered: {
    today: number;
    this_week: number;
    this_month: number;
    all_time: number;
  };
};

type LeaderboardData = {
  success: boolean;
  data: {
    all_time: { data: LeaderboardEntry[] };
    monthly: { data: LeaderboardEntry[] };
    weekly: { data: LeaderboardEntry[] };
  };
};

export function LeaderboardTable() {
  const [timePeriod, setTimePeriod] = useState<'all_time' | 'monthly' | 'weekly'>('all_time');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    let ws: WebSocket | null = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;

    const connectWebSocket = () => {
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        setError("Unable to establish real-time connection. Please refresh the page.");
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/affiliate-stats`;

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttempts = 0;
      };

      ws.onmessage = (event) => {
        try {
          if (!isSubscribed) return;

          const response = JSON.parse(event.data);
          if (response.success && response.data) {
            setLeaderboardData(response);
            setIsLoading(false);
            setError(null);
          }
        } catch (error) {
          console.error('Error parsing WebSocket data:', error);
          setError("Error processing real-time data");
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError("Connection error occurred");
      };

      ws.onclose = () => {
        console.log('WebSocket closed, attempting to reconnect...');
        reconnectAttempts++;
        setTimeout(connectWebSocket, Math.min(1000 * reconnectAttempts, 5000));
      };
    };

    // Initial data fetch
    fetch('/api/affiliate/stats')
      .then(response => response.json())
      .then(response => {
        if (!isSubscribed) return;

        if (response.success && response.data) {
          setLeaderboardData(response);
          setIsLoading(false);
          setError(null);
        }
      })
      .catch(error => {
        console.error('Error fetching initial data:', error);
        setError("Failed to load initial data");
        setIsLoading(false);
      });

    connectWebSocket();

    return () => {
      isSubscribed = false;
      if (ws) {
        ws.close();
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 justify-center">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-destructive">{error}</div>;
  }

  if (!leaderboardData?.data?.[timePeriod]?.data) {
    return <div className="text-center text-muted-foreground">No leaderboard data available</div>;
  }

  const currentData = leaderboardData.data[timePeriod].data
    .map((entry) => ({
      uid: entry.uid,
      name: entry.name,
      wagered: entry.wagered[timePeriod === 'weekly' ? 'this_week' : 
                           timePeriod === 'monthly' ? 'this_month' : 
                           'all_time'] || 0
    }))
    .sort((a, b) => (b.wagered || 0) - (a.wagered || 0))
    .slice(0, 100); // Limit to top 100 for performance

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-center">
        <Button
          variant={timePeriod === 'all_time' ? 'default' : 'outline'}
          onClick={() => setTimePeriod('all_time')}
          className="font-heading tracking-tight"
        >
          ALL TIME
        </Button>
        <Button
          variant={timePeriod === 'monthly' ? 'default' : 'outline'}
          onClick={() => setTimePeriod('monthly')}
          className="font-heading tracking-tight"
        >
          MONTHLY
        </Button>
        <Button
          variant={timePeriod === 'weekly' ? 'default' : 'outline'}
          onClick={() => setTimePeriod('weekly')}
          className="font-heading tracking-tight"
        >
          WEEKLY
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 md:w-20 font-heading text-[#D7FF00] text-sm md:text-base">RANK</TableHead>
              <TableHead className="font-heading text-[#D7FF00] text-sm md:text-base">USERNAME</TableHead>
              <TableHead className="text-right font-heading text-[#D7FF00] text-sm md:text-base">WAGER</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="wait">
              {currentData.map((entry, index) => (
                <motion.tr
                  key={entry.uid}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: index * 0.05 }} // Reduced delay for better performance
                  className="bg-[#1A1B21]/50 backdrop-blur-sm hover:bg-[#1A1B21] cursor-pointer transition-colors"
                >
                  <TableCell className="font-heading text-white py-3 md:py-4 text-sm md:text-base">
                    <div className="flex items-center gap-1">
                      {index < 3 && <Trophy className="h-4 w-4 text-[#D7FF00]" />}
                      {index + 1}
                    </div>
                  </TableCell>
                  <TableCell className="font-sans text-white py-3 md:py-4 text-sm md:text-base">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-[#D7FF00] hidden md:block" />
                      <span className="truncate max-w-[120px] md:max-w-none">{entry.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-sans text-white py-3 md:py-4 text-sm md:text-base">
                    ${entry.wagered.toLocaleString()}
                  </TableCell>
                </motion.tr>
              ))}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}