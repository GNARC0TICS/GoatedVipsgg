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

  // Log errors to console but don't crash the application
  useEffect(() => {
    if (error) {
      console.error("Error loading leaderboard data:", error);
    }
  }, [error]);

  // Prepare loading UI
  const loadingUI = (
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

  // Prepare error UI
  const errorUI = (
    <div className="rounded-lg border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm overflow-hidden p-6">
      <div className="text-center">
        <div className="mb-4">
          <svg className="h-12 w-12 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-xl font-heading text-white mb-2">Unable to Load Leaderboard</h3>
        <p className="text-[#8A8B91] mb-4">
          We're having trouble connecting to the server. Please try again later.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90 transition-all duration-300 px-4 py-2 rounded-md font-medium"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );

  // Return appropriate UI based on state
  if (isLoading) {
    return loadingUI;
  }

  if (error) {
    return errorUI;
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
        <div className="p-4 border-t border-[#2A2B31] mt-4 flex items-center justify-center">
          <div className="bg-[#1A1B21]/80 backdrop-blur-sm border border-[#2A2B31] rounded-lg px-6 py-3">
            <span className="text-[#D7FF00] font-mono text-lg font-bold">
              Total Wagered{" "}
              {timePeriod === "all_time"
                ? "All Time"
                : timePeriod === "monthly"
                  ? "This Month"
                  : timePeriod === "weekly"
                    ? "This Week"
                    : "Today"}
              : ${totalDailyWager.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
