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

  const filteredData = useMemo(() => {
    return data.filter((entry) =>
      entry.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [data, searchQuery]);

  const paginatedData = useMemo(() => {
    const start = currentPage * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const pageCount = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search players..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm bg-transparent border-[#2A2B31] focus:border-[#D7FF00] focus:ring-[#D7FF00]"
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
            {paginatedData.map((entry, index) => {
              const rank = currentPage * ITEMS_PER_PAGE + index + 1;
              return (
                <TableRow key={entry.uid} className="hover:bg-white/5">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {getTrophyIcon(rank)}
                      <span className="text-white">{rank}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <QuickProfile userId={entry.uid} username={entry.name} />
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ${entry.wagered[timePeriod].toFixed(2)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-center gap-2">
        <Button
          variant="outline"
          onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
          disabled={currentPage === 0}
          className="border-[#2A2B31] hover:border-[#D7FF00] hover:text-[#D7FF00]"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          onClick={() => setCurrentPage((p) => Math.min(pageCount - 1, p + 1))}
          disabled={currentPage === pageCount - 1}
          className="border-[#2A2B31] hover:border-[#D7FF00] hover:text-[#D7FF00]"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}