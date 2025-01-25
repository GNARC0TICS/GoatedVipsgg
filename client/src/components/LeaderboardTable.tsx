import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Clock,
  Calendar,
  CalendarDays,
  Search,
  Crown,
  Medal,
  Award,
  TrendingUp,
  Star,
  Trophy,
  CircleDot,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLeaderboard, type TimePeriod } from "@/hooks/use-leaderboard";
import { getTierFromWager, getTierIcon } from "@/lib/tier-utils";
import { QuickProfile } from "@/components/QuickProfile";
import { motion, AnimatePresence } from "framer-motion";

const ITEMS_PER_PAGE = 10;

interface LeaderboardTableProps {
  timePeriod: TimePeriod;
}

export function LeaderboardTable({ timePeriod }: LeaderboardTableProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading, error, metadata, refetch } = useLeaderboard(timePeriod);

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter((entry) =>
      entry.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [data, searchQuery]);

  const getTrophyIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-8 w-8 text-yellow-400 animate-pulse" />;
      case 2:
        return <Medal className="h-7 w-7 text-gray-400" />;
      case 3:
        return <Award className="h-7 w-7 text-amber-700" />;
      default:
        return <Star className="h-5 w-5 text-zinc-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-20 font-heading text-[#D7FF00]">RANK</TableHead>
              <TableHead className="font-heading text-[#D7FF00]">USERNAME</TableHead>
              <TableHead className="text-right font-heading text-[#D7FF00]">WAGER</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(10)].map((_, i) => (
              <TableRow key={i} className="bg-[#1A1B21]/50 backdrop-blur-sm">
                <TableCell>
                  <div className="animate-pulse h-6 w-16 bg-muted rounded" />
                </TableCell>
                <TableCell>
                  <div className="animate-pulse h-6 w-32 bg-muted rounded" />
                </TableCell>
                <TableCell className="text-right">
                  <div className="animate-pulse h-6 w-24 bg-muted rounded ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  const getWagerAmount = (entry: any) => {
    if (!entry?.wagered) return 0;
    switch (timePeriod) {
      case "weekly":
        return entry.wagered.this_week;
      case "monthly":
        return entry.wagered.this_month;
      case "today":
        return entry.wagered.today;
      case "all_time":
        return entry.wagered.all_time;
    }
  };

  const renderTimePeriodIcon = (period: TimePeriod) => {
    switch (period) {
      case "today":
        return <Clock className="h-4 w-4" />;
      case "weekly":
        return <Calendar className="h-4 w-4" />;
      case "monthly":
        return <CalendarDays className="h-4 w-4" />;
      case "all_time":
        return <Trophy className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center mb-4 text-center">
        <div>
          <motion.h2
            key={timePeriod}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-heading font-bold text-[#D7FF00] mb-2 text-center tracking-tighter"
            style={{
              textShadow: '0 0 10px rgba(215, 255, 0, 0.5), 0 0 20px rgba(215, 255, 0, 0.3)'
            }}
          >
            {(timePeriod || 'today').toUpperCase()}
          </motion.h2>
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <CircleDot className="h-4 w-4 text-red-500 animate-pulse" />
              <span className="text-[#D7FF00] font-heading">LIVE UPDATES</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 max-w-md mx-auto w-full">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31] text-white"
          />
        </div>
      </div>

      <div className="rounded-lg border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm overflow-x-auto shadow-glow-lg">
        <Table className="w-full">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[50px] md:w-20 font-heading text-[#D7FF00] px-1 md:px-4 text-xs md:text-base whitespace-nowrap">RANK</TableHead>
              <TableHead className="font-heading text-[#D7FF00] px-1 md:px-4 text-xs md:text-base">USERNAME</TableHead>
              <TableHead className="text-right font-heading text-[#D7FF00] px-1 md:px-4 text-xs md:text-base whitespace-nowrap">WAGER</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {filteredData
                .slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE)
                .map((entry, index) => (
                  <motion.tr
                    key={entry.uid}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="bg-[#1A1B21]/50 backdrop-blur-sm hover:bg-[#1A1B21] transition-colors"
                    exit={{ opacity: 0, y: 20 }}
                  >
                    <TableCell className="font-heading px-1 md:px-4">
                      <div className="flex items-center gap-1 md:gap-2">
                        <div className="hidden md:block">
                          {getTrophyIcon(index + 1 + currentPage * ITEMS_PER_PAGE)}
                        </div>
                        <span className="text-[#D7FF00] text-xs md:text-base">
                          {index + 1 + currentPage * ITEMS_PER_PAGE}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <QuickProfile userId={entry.uid} username={entry.name}>
                        <div className="flex items-center gap-2 cursor-pointer">
                          <img
                            src={getTierIcon(getTierFromWager(entry.wagered.all_time))}
                            alt="Tier"
                            className="w-5 h-5"
                          />
                          <span className="truncate text-white hover:text-[#D7FF00] transition-colors">
                            {entry.name}
                          </span>
                        </div>
                      </QuickProfile>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-white font-semibold">
                          ${(getWagerAmount(entry) || 0).toLocaleString()}
                        </span>
                        {entry.isWagering && entry.wagerChange > 0 && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-green-500 flex items-center gap-1"
                          >
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-xs font-bold">
                              +${entry.wagerChange.toLocaleString()}
                            </span>
                          </motion.div>
                        )}
                      </div>
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