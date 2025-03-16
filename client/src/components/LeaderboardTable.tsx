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
  AlertCircle,
} from "lucide-react";
import { useLeaderboard, TimePeriod } from "@/hooks/use-leaderboard";
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
  
  console.log("LeaderboardTable receiving:", { timePeriod, data, isLoading, error });

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

  // Add proper null checking for the data
  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    return data.filter((entry) => 
      entry && entry.name && entry.name.toLowerCase().includes(searchQuery.toLowerCase())
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
    return (
      <div className="text-center text-red-500 p-4 border border-red-300 rounded-lg bg-red-100/10">
        <AlertCircle className="h-6 w-6 mx-auto mb-2" />
        <p>Error loading leaderboard data: {error.message}</p>
      </div>
    );
  }

  // Show message when no data is available but ensure we're always rendering something
  if (!data || !Array.isArray(data) || !filteredData.length) {
    return (
      <div className="text-center text-gray-400 p-8">
        <p className="mb-2">No leaderboard data available for this time period.</p>
        <p className="text-sm">Please check back later or try another time period.</p>
      </div>
    );
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
              // Use a safer way to access wagered amount based on time period
              const getWageredAmount = () => {
                try {
                  // If we're working with the processed data from the hook directly
                  if (entry && typeof entry === 'object' && 'wagered' in entry) {
                    // Map the timePeriod to the actual property in the wagered object
                    const periodMapping = {
                      today: 'today',
                      weekly: 'this_week',
                      monthly: 'this_month',
                      all_time: 'all_time'
                    };
                    
                    const periodKey = periodMapping[timePeriod] || timePeriod;
                    console.log("getWageredAmount: mapping", { timePeriod, periodKey, entry });
                    
                    if (entry.wagered && typeof entry.wagered === 'object' && periodKey in entry.wagered) {
                      return entry.wagered[periodKey].toFixed(2);
                    } else if (entry.wagered && typeof entry.wagered === 'number') {
                      // If wagered is a direct number value
                      return entry.wagered.toFixed(2);
                    }
                  }
                  
                  // If entry has a direct amount property
                  if (entry && typeof entry === 'object' && 'amount' in entry) {
                    return typeof entry.amount === 'number' ? entry.amount.toFixed(2) : entry.amount;
                  }
                } catch (error) {
                  console.error("Error getting wagered amount:", error);
                }
                
                return '0.00';
              };
              
              return (
                <TableRow key={entry.uid || index} className="hover:bg-white/5">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {getTrophyIcon(rank)}
                      <span className="text-white">{rank}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <QuickProfile userId={entry.uid} username={entry.name}>
                      {entry.name}
                    </QuickProfile>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ${getWageredAmount()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 && (
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
            disabled={currentPage === pageCount - 1 || pageCount === 0}
            className="border-[#2A2B31] hover:border-[#D7FF00] hover:text-[#D7FF00]"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}