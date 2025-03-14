import { useState, useMemo, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Crown,
  Medal,
  Award,
  Star,
  TrendingUp,
  CircleDot,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";
import React from "react";
import { useLeaderboard, type TimePeriod } from "@/hooks/use-leaderboard";
import { getTierFromWager, getTierIcon } from "@/lib/tier-utils";
import { QuickProfile } from "@/components/QuickProfile";
import { motion } from "framer-motion";

const ITEMS_PER_PAGE = 10;

interface LeaderboardTableProps {
  timePeriod: TimePeriod;
}

interface LeaderboardEntry {
  uid: string;
  name: string;
  wagered: {
    today: number;
    this_week: number;
    this_month: number;
    all_time: number;
  };
  isWagering?: boolean;
  wagerChange?: number;
}

// Use named function instead of React.memo
export function LeaderboardTable({ timePeriod }: LeaderboardTableProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const { data = [], isLoading, error } = useLeaderboard(timePeriod);

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter((entry: LeaderboardEntry) =>
      entry.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [data, searchQuery]);

  const totalPages = Math.ceil((filteredData?.length || 0) / ITEMS_PER_PAGE);

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

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
  };

  const getWagerAmount = (entry: LeaderboardEntry) => {
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
      default:
        return 0;
    }
  };

  const totalDailyWager = useMemo(() => {
    if (!data) return 0;
    return data.reduce((total, entry) => total + getWagerAmount(entry), 0);
  }, [data, timePeriod]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-20 font-heading text-[#D7FF00]">
                RANK
              </TableHead>
              <TableHead className="font-heading text-[#D7FF00]">
                USERNAME
              </TableHead>
              <TableHead className="text-right font-heading text-[#D7FF00]">
                WAGER
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
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

  if (error) {
    return (
      <div className="text-center text-red-500">
        Error loading leaderboard data
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 max-w-md mx-auto w-full mb-4">
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
        <div className="flex items-center gap-1 px-3 py-1 bg-[#1A1B21]/50 border border-[#2A2B31] rounded-lg">
          <CircleDot className="h-3 w-3 text-red-500 animate-pulse" />
          <span className="text-xs text-red-500 font-heading">LIVE</span>
        </div>
      </div>

      <div className="rounded-lg border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm overflow-hidden">
        <div
          className="overflow-x-auto"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#2A2B31 #14151A" }}
        >
          <Table className="w-full">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[50px] md:w-20 font-heading text-[#D7FF00] px-1 md:px-4 text-xs md:text-base whitespace-nowrap font-black">
                  RANK
                </TableHead>
                <TableHead className="font-heading text-[#D7FF00] px-1 md:px-4 text-xs md:text-base font-black">
                  USERNAME
                </TableHead>
                <TableHead className="text-right font-heading text-[#D7FF00] px-1 md:px-4 text-xs md:text-base whitespace-nowrap font-black">
                  WAGER
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData
                .slice(
                  currentPage * ITEMS_PER_PAGE,
                  (currentPage + 1) * ITEMS_PER_PAGE,
                )
                .map((entry, index) => (
                  <motion.tr
                    key={entry.uid}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="bg-[#1A1B21]/50 backdrop-blur-sm hover:bg-[#1A1B21] transition-colors"
                  >
                    <TableCell className="font-heading px-1 md:px-4">
                      <div className="flex items-center gap-1 md:gap-2">
                        <div className="hidden md:block">
                          {getTrophyIcon(
                            index + 1 + currentPage * ITEMS_PER_PAGE,
                          )}
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
                            src={getTierIcon(
                              getTierFromWager(entry.wagered.all_time),
                            )}
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
            </TableBody>
          </Table>
        </div>

        <div className="p-4 border-t border-[#2A2B31] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#8A8B91]">
            <Users className="h-4 w-4" />
            <span className="text-sm">{filteredData.length} Players</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevPage}
              disabled={currentPage === 0}
              className="h-8 w-8 border-[#2A2B31] hover:bg-[#2A2B31] hover:text-[#D7FF00]"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-[#8A8B91] text-sm px-2">
              Page {currentPage + 1} of {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages - 1}
              className="h-8 w-8 border-[#2A2B31] hover:bg-[#2A2B31] hover:text-[#D7FF00]"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="text-right mt-4 text-[#D7FF00] font-mono text-lg">
          Total Wagered{" "}
          {timePeriod === "all_time"
            ? "All Time"
            : timePeriod === "monthly"
              ? "This Month"
              : timePeriod === "weekly"
                ? "This Week"
                : "Today"}
          : ${totalDailyWager.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
