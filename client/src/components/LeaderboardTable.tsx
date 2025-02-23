import {
  Table,
  TableBody,
  TableCell,
  TableHead,  
  TableHeader,
  TableRow
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
  Users
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { useLeaderboard, type TimePeriod } from "@/hooks/use-leaderboard";
import React, { useState, useEffect, useMemo } from "react";
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

  const filteredData = React.useMemo(() => {
    if (!data) return [];
    return data.filter((entry) =>
      entry.name.toLowerCase().includes(searchQuery.toLowerCase())
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

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-[#8A8B91]" />
          <Input
            placeholder="Search username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 bg-[#1A1B21] border-[#2A2B31] text-white placeholder:text-[#8A8B91]"
          />
        </div>
      </div>

      <div className="rounded-md border border-[#2A2B31]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] text-[#8A8B91]">#</TableHead>
              <TableHead className="text-[#8A8B91]">Username</TableHead>
              <TableHead className="text-right text-[#8A8B91]">
                Total Wagered
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData
              .slice(
                currentPage * ITEMS_PER_PAGE,
                (currentPage + 1) * ITEMS_PER_PAGE
              )
              .map((entry, index) => {
                const actualRank = currentPage * ITEMS_PER_PAGE + index + 1;
                return (
                  <TableRow key={entry.uid}>
                    <TableCell className="font-medium text-[#8A8B91] w-[50px]">
                      <div className="flex items-center gap-2">
                        {actualRank <= 3 ? (
                          getTrophyIcon(actualRank)
                        ) : (
                          <span>{actualRank}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <QuickProfile
                        userId={entry.uid}
                        username={entry.name}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-white">{entry.name}</span>
                          {entry.isWagering && (
                            <CircleDot className="h-3 w-3 text-[#D7FF00] animate-pulse" />
                          )}
                        </div>
                      </QuickProfile>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-white">
                          $
                          {entry.wagered[
                            timePeriod === "weekly"
                              ? "this_week"
                              : timePeriod === "monthly"
                                ? "this_month"
                                : timePeriod === "today"
                                  ? "today"
                                  : "all_time"
                          ].toLocaleString()}
                        </span>
                        {entry.wagerChange && entry.wagerChange > 0 && (
                          <TrendingUp className="h-4 w-4 text-[#D7FF00]" />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-[#8A8B91]">
          <Users className="h-4 w-4" />
          <span>{filteredData.length} Players</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            className="bg-[#1A1B21] border-[#2A2B31] text-white hover:bg-[#2A2B31]"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextPage}
            disabled={currentPage === totalPages - 1}
            className="bg-[#1A1B21] border-[#2A2B31] text-white hover:bg-[#2A2B31]"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}