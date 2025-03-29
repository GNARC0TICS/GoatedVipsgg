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
import { useLeaderboard } from "@/hooks/use-leaderboard";
import { getTierFromWager, getTierIcon, type TierLevel } from "@/lib/tier-utils";
import { QuickProfile } from "@/components/QuickProfile";
import { motion } from "framer-motion";
import { LeaderboardEntry, TimePeriod } from "@/types/api";

// Format large numbers with K/M/B suffixes
function formatNumber(num: number): string {
  // First ensure we have a valid number and convert full float to fixed 2 decimal places
  const fixedNum = parseFloat(num.toFixed(2));
  
  if (fixedNum >= 1000000000) {
    return (fixedNum / 1000000000).toFixed(1) + "B";
  }
  if (fixedNum >= 1000000) {
    return (fixedNum / 1000000).toFixed(1) + "M";
  }
  if (fixedNum >= 1000) {
    return (fixedNum / 1000).toFixed(1) + "K";
  }
  
  // For smaller numbers, display with 2 decimal places only if they have cents
  return fixedNum % 1 === 0 ? fixedNum.toString() : fixedNum.toFixed(2);
}

interface LeaderboardTableProps {
  data: LeaderboardEntry[];
  period: TimePeriod;
}

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
  const timePeriod = period; // Rename for internal use
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
  const periodProp = periodToProperty[timePeriod];
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#D7FF00]/70" />
          <Input
            placeholder="Search by username..."
            className="pl-10 bg-[#1A1B21]/80 border-[#2A2B31] focus:border-[#D7FF00]/50 focus:ring-[#D7FF00]/20 rounded-md h-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="text-sm font-medium px-3 py-1.5 rounded-full bg-[#1A1B21]/80 border border-[#2A2B31] text-[#D7FF00]">
          Total players: {data.length}
        </div>
      </div>
      
      <div className="rounded-xl border border-[#2A2B31] bg-gradient-to-b from-[#1A1B21]/80 to-[#14151A]/95 backdrop-blur-sm overflow-hidden shadow-lg">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-[#2A2B31]">
              <TableHead className="w-20 font-heading text-[#D7FF00] text-base py-4">
                RANK
              </TableHead>
              <TableHead className="font-heading text-[#D7FF00] text-base py-4">
                PLAYER
              </TableHead>
              <TableHead className="text-right font-heading text-[#D7FF00] text-base py-4">
                WAGERED
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="custom-scrollbar">
            {paginatedData.map((entry, index) => {
              const rank = startIndex + index + 1;
              // Use the current period's wagered amount for display
              const wageredAmount = entry.wagered[periodProp] || 0;
              // Always use all_time wagered amount for determining tier
              const allTimeWagered = entry.wagered.all_time || 0;
              const tier = getTierFromWager(allTimeWagered);
              
              // Determine background color based on rank
              let rowBgClass = "";
              if (rank === 1) rowBgClass = "bg-yellow-500/10 hover:bg-yellow-500/15";
              else if (rank === 2) rowBgClass = "bg-gray-400/10 hover:bg-gray-400/15";
              else if (rank === 3) rowBgClass = "bg-amber-700/10 hover:bg-amber-700/15";
              else rowBgClass = index % 2 === 0 ? "hover:bg-[#2A2B31]/20" : "bg-[#1A1B21]/40 hover:bg-[#2A2B31]/20";
              
              return (
                <TableRow 
                  key={`${entry.uid}-${index}`}
                  className={`${rowBgClass} transition-colors duration-200`}
                >
                  <TableCell className="font-mono py-3 pl-5">
                    <div className="flex items-center">
                      {rank === 1 ? (
                        <div className="w-7 h-7 rounded-full bg-yellow-500/20 flex items-center justify-center">
                          <Crown className="h-4 w-4 text-yellow-400" />
                        </div>
                      ) : rank === 2 ? (
                        <div className="w-7 h-7 rounded-full bg-gray-400/20 flex items-center justify-center">
                          <Medal className="h-4 w-4 text-gray-400" />
                        </div>
                      ) : rank === 3 ? (
                        <div className="w-7 h-7 rounded-full bg-amber-700/20 flex items-center justify-center">
                          <Award className="h-4 w-4 text-amber-700" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[#2A2B31]/40 flex items-center justify-center">
                          <span className="text-sm text-white/70">{rank}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <QuickProfile userId={entry.uid} username={entry.name}>
                      <div className="flex items-center gap-2.5">
                        <span className="font-medium text-white hover:text-[#D7FF00] transition-colors cursor-pointer">
                          {entry.name}
                        </span>
                        
                        {/* Show tier badge but keep it subtle */}
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#2A2B31]/40 text-[#8A8B91]">
                          {tier}
                        </span>
                      </div>
                    </QuickProfile>
                  </TableCell>
                  <TableCell className="text-right font-mono py-3 pr-5 text-[#D7FF00]">
                    ${formatNumber(wageredAmount)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination controls with enhanced styling */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="bg-[#1A1B21]/80 border-[#2A2B31] hover:bg-[#2A2B31]/90 hover:text-[#D7FF00]"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-sm bg-[#1A1B21]/80 border border-[#2A2B31] rounded-full px-4 py-1.5 text-white/80">
            Page {currentPage} of {totalPages}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="bg-[#1A1B21]/80 border-[#2A2B31] hover:bg-[#2A2B31]/90 hover:text-[#D7FF00]"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
