
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion, AnimatePresence } from "framer-motion";
import { useLeaderboard, type TimePeriod } from "@/hooks/use-leaderboard";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function LeaderboardTable() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all_time');
  const { data, isLoading } = useLeaderboard(timePeriod);

  if (isLoading) {
    return (
      <div className="w-full space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="w-full h-12" />
        ))}
      </div>
    );
  }

  if (!data || !Array.isArray(data)) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-center">
        <Button
          variant={timePeriod === 'weekly' ? 'default' : 'outline'}
          onClick={() => setTimePeriod('weekly')}
        >
          Weekly
        </Button>
        <Button
          variant={timePeriod === 'monthly' ? 'default' : 'outline'}
          onClick={() => setTimePeriod('monthly')}
        >
          Monthly
        </Button>
        <Button
          variant={timePeriod === 'all_time' ? 'default' : 'outline'}
          onClick={() => setTimePeriod('all_time')}
        >
          All Time
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Rank</TableHead>
            <TableHead>Username</TableHead>
            <TableHead className="text-right">Total Wager</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence>
            {data.map((entry) => (
              <motion.tr
                key={entry.username}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-background/50 backdrop-blur-sm"
              >
                <TableCell className="font-medium">{entry.rank}</TableCell>
                <TableCell>{entry.username}</TableCell>
                <TableCell className="text-right">
                  ${entry.totalWager.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </TableCell>
              </motion.tr>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>
    </div>
  );
}
