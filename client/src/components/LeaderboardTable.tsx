import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, User } from "lucide-react";
import { useState, useEffect } from "react";

type LeaderboardEntry = {
  username: string;
  totalWager: number;
  commission: number;
};

type LeaderboardData = {
  all_time: { data: LeaderboardEntry[] };
  monthly: { data: LeaderboardEntry[] };
  weekly: { data: LeaderboardEntry[] };
};

export function LeaderboardTable() {
  const [timePeriod, setTimePeriod] = useState<'all_time' | 'monthly' | 'weekly'>('all_time');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);

  useEffect(() => {
    // Initial data fetch
    fetch('/api/affiliate/stats')
      .then(response => response.json())
      .then(data => setLeaderboardData(data))
      .catch(error => console.error('Error fetching initial data:', error));

    // Setup WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const ws = new WebSocket(`${protocol}//${host}/ws/affiliate-stats`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLeaderboardData(data);
      } catch (error) {
        console.error('Error parsing WebSocket data:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  if (!leaderboardData) {
    return (
      <div className="w-full space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="w-full h-12" />
        ))}
      </div>
    );
  }

  const currentData = leaderboardData[timePeriod].data;

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
          <AnimatePresence>
            {currentData.map((entry, index) => (
              <motion.tr
                key={entry.username}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-[#1A1B21]/50 backdrop-blur-sm hover:bg-[#1A1B21] cursor-pointer transition-colors"
              >
                <TableCell className="font-heading text-white">{index + 1}</TableCell>
                <TableCell className="font-sans text-white flex items-center gap-2">
                  <User className="h-4 w-4 text-[#D7FF00]" />
                  {entry.username}
                </TableCell>
                <TableCell className="text-right font-sans text-white">
                  ${entry.totalWager.toLocaleString()}
                </TableCell>
              </motion.tr>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>
    </div>
  );
}