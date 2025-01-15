
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { User } from "lucide-react";
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

  useEffect(() => {
    let ws: WebSocket | null = null;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/affiliate-stats`;

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data);
          if (response.success && response.data) {
            setLeaderboardData(response);
            setIsLoading(false);
          }
        } catch (error) {
          console.error('Error parsing WebSocket data:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket closed, attempting to reconnect...');
        setTimeout(connectWebSocket, 3000);
      };
    };

    fetch('/api/affiliate/stats')
      .then(response => response.json())
      .then(response => {
        if (response.success && response.data) {
          setLeaderboardData(response);
          setIsLoading(false);
        }
      })
      .catch(error => {
        console.error('Error fetching initial data:', error);
        setIsLoading(false);
      });

    connectWebSocket();

    return () => {
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

  if (!leaderboardData?.data?.[timePeriod]) {
    return <div>No leaderboard data available</div>;
  }

  const currentData = leaderboardData.data[timePeriod]?.data || [];

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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20 font-heading text-[#D7FF00]">RANK</TableHead>
            <TableHead className="font-heading text-[#D7FF00]">USERNAME</TableHead>
            <TableHead className="text-right font-heading text-[#D7FF00]">TOTAL WAGER</TableHead>
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
                transition={{ delay: index * 0.1 }}
                className="bg-[#1A1B21]/50 backdrop-blur-sm hover:bg-[#1A1B21] cursor-pointer transition-colors"
              >
                <TableCell className="font-heading text-white">{index + 1}</TableCell>
                <TableCell className="font-sans text-white flex items-center gap-2">
                  <User className="h-4 w-4 text-[#D7FF00]" />
                  {entry.name}
                </TableCell>
                <TableCell className="text-right font-sans text-white">
                  ${entry.wagered[timePeriod === 'weekly' ? 'this_week' : timePeriod === 'monthly' ? 'this_month' : 'all_time'].toLocaleString()}
                </TableCell>
              </motion.tr>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>
    </div>
  );
}
