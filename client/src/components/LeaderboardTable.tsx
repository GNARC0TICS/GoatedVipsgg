import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Crown,
  Medal,
  Award,
  Star,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import type { TimePeriod } from "@/hooks/use-leaderboard";
import { QuickProfile } from "@/components/QuickProfile";
import { motion } from "framer-motion";


const ITEMS_PER_PAGE = 10;

interface LeaderboardTableProps {
  timePeriod: TimePeriod;
}

export function LeaderboardTable({ timePeriod }: LeaderboardTableProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading, error } = useLeaderboard(timePeriod);

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
    return <div className="text-center text-red-500">Error loading leaderboard data</div>;
  }

  const filteredData = useMemo(() => {
    return data?.data?.[timePeriod]?.data.filter((entry) =>
      entry.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];
  }, [data, searchQuery, timePeriod]);

  const paginatedData = filteredData.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
  };

  const getWagerAmount = (entry: any) => {
    return entry.wagered[timePeriod === "today" ? "today" : 
           timePeriod === "weekly" ? "this_week" :
           timePeriod === "monthly" ? "this_month" : "all_time"];
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search players..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-[#1A1B21] border-[#2A2B31]"
        />
      </div>

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
            {paginatedData.map((entry, index) => (
              <TableRow key={entry.uid} className="hover:bg-white/5">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {getTrophyIcon(currentPage * ITEMS_PER_PAGE + index + 1)}
                    {currentPage * ITEMS_PER_PAGE + index + 1}
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
                  ${getWagerAmount(entry).toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={handlePrevPage}
          disabled={currentPage === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <div className="text-sm text-muted-foreground">
          Page {currentPage + 1} of {totalPages}
        </div>
        <Button
          variant="outline"
          onClick={handleNextPage}
          disabled={currentPage >= totalPages - 1}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}