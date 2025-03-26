import { useState, useMemo } from "react";
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
import { getTierFromWager, getTierIcon, type TierLevel } from "@/lib/tier-utils";
import { QuickProfile } from "@/components/QuickProfile";
import { motion } from "framer-motion";

// Format large numbers with K/M/B suffixes
function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + "B";
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

import { LeaderboardEntry, LeaderboardTableProps } from '@/components/types';

const ITEMS_PER_PAGE = 10;

// Map time periods to their property names in the API response
const periodToProperty: Record<TimePeriod, keyof LeaderboardEntry['wagered']> = {
  today: 'today',
  weekly: 'this_week',
  monthly: 'this_month',
  all_time: 'all_time'
};

// Helper function to get rank badges
function getRankBadge(rank: number) {
  if (rank === 1) return <Crown className="h-5 w-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
  if (rank === 3) return <Award className="h-5 w-5 text-amber-700" />;
  return rank;
}

// Get tier badge based on wagered amount
function getTierBadge(tier: TierLevel) {
  return (
    <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-opacity-20 ${
      tier === 'DIAMOND' ? 'bg-blue-500 text-blue-200' :
      tier === 'EMERALD' ? 'bg-green-500 text-green-200' :
      tier === 'SAPPHIRE' ? 'bg-blue-600 text-blue-200' :
      tier === 'PEARL' ? 'bg-purple-500 text-purple-200' :
      tier === 'PLATINUM' ? 'bg-gray-400 text-gray-100' :
      tier === 'GOLD' ? 'bg-yellow-500 text-yellow-200' :
      tier === 'SILVER' ? 'bg-gray-300 text-gray-800' :
      tier === 'BRONZE' ? 'bg-amber-600 text-amber-200' :
      'bg-orange-800 text-orange-200'
    }`}>
      {tier}
    </div>
  );
}

export function LeaderboardTable({ data, period }: LeaderboardTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!searchTerm.trim()) return data;
    return data.filter(entry => 
      entry.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);
  
  // Calculate pagination
  const totalPages = Math.ceil((filteredData?.length || 0) / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedData = filteredData?.slice(startIndex, startIndex + ITEMS_PER_PAGE) || [];
  
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No leaderboard data available
      </div>
    );
  }

  // Get the correct property name for the current period
  const periodProp = periodToProperty[period];
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by username..."
            className="pl-10 bg-background/50 border-muted"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="text-sm text-gray-400">
          Total users: {data.length}
        </div>
      </div>
      
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
                TIER
              </TableHead>
              <TableHead className="text-right font-heading text-[#D7FF00]">
                WAGERED
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((entry, index) => {
              const rank = startIndex + index + 1;
              const wageredAmount = entry.wagered[periodProp] || 0;
              const tier = getTierFromWager(wageredAmount);
              
              return (
                <TableRow 
                  key={`${entry.uid}-${index}`}
                  className={rank <= 3 ? "bg-opacity-20 bg-yellow-900 hover:bg-yellow-900/30" : ""}
                >
                  <TableCell className="font-mono">
                    <div className="flex items-center">
                      {getRankBadge(rank)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <QuickProfile userId={entry.uid} username={entry.name}>
                      <div className="font-medium text-white hover:text-[#D7FF00] transition-colors cursor-pointer">
                        {entry.name}
                      </div>
                    </QuickProfile>
                  </TableCell>
                  <TableCell className="text-right">
                    {getTierBadge(tier)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ${formatNumber(wageredAmount)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-sm">
            Page {currentPage} of {totalPages}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}