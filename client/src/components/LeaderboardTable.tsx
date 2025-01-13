import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type TimePeriod = 'weekly' | 'monthly' | 'all_time';

type APIResponse = {
  success: boolean;
  data: Array<{
    uid: string;
    name: string;
    wagered: {
      today: number;
      this_week: number;
      this_month: number;
      all_time: number;
    };
  }>;
};

export function LeaderboardTable() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all_time');

  const { data: response, isLoading } = useQuery<APIResponse>({
    queryKey: ['/api/affiliate/stats'],
  });

  if (isLoading) {
    return (
      <div className="w-full space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="w-full h-12" />
        ))}
      </div>
    );
  }

  if (!response?.success || !Array.isArray(response?.data)) {
    return (
      <div className="text-center py-8 text-[#8A8B91]">
        No data available
      </div>
    );
  }

  const transformedData = response.data
    .map((entry, index) => ({
      username: entry.name,
      totalWager: timePeriod === 'weekly' ? entry.wagered.this_week :
                 timePeriod === 'monthly' ? entry.wagered.this_month :
                 entry.wagered.all_time,
      rank: index + 1,
    }))
    .sort((a, b) => b.totalWager - a.totalWager)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-center">
        <Button
          variant={timePeriod === 'weekly' ? 'default' : 'outline'}
          onClick={() => setTimePeriod('weekly')}
          className="font-heading"
        >
          WEEKLY
        </Button>
        <Button
          variant={timePeriod === 'monthly' ? 'default' : 'outline'}
          onClick={() => setTimePeriod('monthly')}
          className="font-heading"
        >
          MONTHLY
        </Button>
        <Button
          variant={timePeriod === 'all_time' ? 'default' : 'outline'}
          onClick={() => setTimePeriod('all_time')}
          className="font-heading"
        >
          ALL TIME
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
            {transformedData.map((entry) => (
              <motion.tr
                key={entry.username}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-[#1A1B21]/50 backdrop-blur-sm"
              >
                <TableCell className="font-heading text-white">{entry.rank}</TableCell>
                <TableCell className="font-sans text-white">{entry.username}</TableCell>
                <TableCell className="text-right font-sans text-white">
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