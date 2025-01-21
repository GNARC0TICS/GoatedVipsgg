import { Table, TableHeader, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Trophy, ChevronLeft, ChevronRight, Clock, Calendar, CalendarDays, Search, Crown, Medal, Award, TrendingUp, Star } from "lucide-react";
import { useState, useMemo } from "react";
import { useLeaderboard, type TimePeriod } from "@/hooks/use-leaderboard";
import { CircleDot } from 'lucide-react';
import { QuickProfile } from "@/components/QuickProfile";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const ITEMS_PER_PAGE = 10;

export function LeaderboardTable() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('today');
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: leaderboardEntries, isLoading, error, metadata, refetch } = useLeaderboard(timePeriod);

  const handleTimePeriodChange = (newPeriod: TimePeriod) => {
    setTimePeriod(newPeriod);
    setCurrentPage(0);
    refetch();
  };

  const filteredData = useMemo(() => {
    if (!leaderboardEntries) return [];
    return leaderboardEntries.filter(entry =>
      entry.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [leaderboardEntries, searchQuery]);

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

  const totalPages = useMemo(() => {
    return Math.ceil((filteredData?.length || 0) / ITEMS_PER_PAGE);
  }, [filteredData]);

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const getWagerAmount = (entry: LeaderboardEntry) => {
    if (!entry?.wagered) return 0;

    switch (timePeriod) {
      case 'weekly':
        return entry.wagered.this_week || 0;
      case 'monthly':
        return entry.wagered.this_month || 0;
      case 'today':
        return entry.wagered.today || 0;
      case 'all_time':
        return entry.wagered.all_time || 0;
    }
  };

  const renderTimePeriodIcon = (period: TimePeriod) => {
    switch (period) {
      case 'today':
        return <Clock className="h-4 w-4" />;
      case 'weekly':
        return <Calendar className="h-4 w-4" />;
      case 'monthly':
        return <CalendarDays className="h-4 w-4" />;
      case 'all_time':
        return <Trophy className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6">
        <div>
          <h2 className="text-2xl md:text-4xl font-heading font-bold text-[#D7FF00] mb-2">Live Leaderboard</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CircleDot className="h-4 w-4 text-red-500 animate-pulse" />
              <span className="text-[#8A8B91]">Live Competition</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex gap-2 justify-center flex-wrap">
          {[
            { id: 'today', label: 'TODAY' },
            { id: 'weekly', label: 'WEEKLY' },
            { id: 'monthly', label: 'MONTHLY' },
            { id: 'all_time', label: 'ALL TIME' }
          ].map(({ id, label }) => (
            <Button
              key={id}
              variant={timePeriod === id ? 'default' : 'outline'}
              onClick={() => handleTimePeriodChange(id as TimePeriod)}
              className={`font-heading tracking-tight flex items-center gap-2 ${
                timePeriod === id ? 'bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90' : 'border-[#2A2B31] hover:border-[#D7FF00]/50'
              }`}
            >
              {renderTimePeriodIcon(id as TimePeriod)}
              {label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2 max-w-md mx-auto w-full">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8B91]" />
            <Input
              type="text"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#1A1B21]/50 border-[#2A2B31] text-white placeholder:text-[#8A8B91] hover:border-[#D7FF00]/50 focus:border-[#D7FF00] focus:ring-[#D7FF00]"
            />
          </div>
        </div>
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
            {filteredData.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE).map((entry, index) => (
              <TableRow key={entry.uid} className="bg-[#1A1B21]/50 backdrop-blur-sm hover:bg-[#1A1B21]">
                <TableCell className="font-heading">
                  <div className="flex items-center gap-2">
                    {getTrophyIcon(index + 1 + currentPage * ITEMS_PER_PAGE)}
                    {index + 1 + currentPage * ITEMS_PER_PAGE}
                  </div>
                </TableCell>
                <TableCell>
                  <QuickProfile userId={entry.uid} username={entry.name}>
                    <div className="flex items-center gap-2 cursor-pointer">
                      <User className="h-4 w-4 text-[#D7FF00]" />
                      <span className={`truncate ${index < 3 ? 'font-bold' : ''}`}>
                        {entry.name}
                      </span>
                    </div>
                  </QuickProfile>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    ${getWagerAmount(entry).toLocaleString()}
                    {entry.wagerChange > 0 && (
                      <div className="text-green-500 flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 animate-pulse" />
                        <span className="text-xs">+${entry.wagerChange.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between px-4 py-4 border-t border-[#2A2B31]">
          <div className="text-sm text-[#8A8B91]">
            Showing {currentPage * ITEMS_PER_PAGE + 1} to {Math.min((currentPage + 1) * ITEMS_PER_PAGE, filteredData.length)} of {filteredData.length}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="border-[#2A2B31] hover:border-[#D7FF00]/50"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
              className="border-[#2A2B31] hover:border-[#D7FF00]/50"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

type WageredData = {
  today: number;
  this_week: number;
  this_month: number;
  all_time: number;
};

type LeaderboardEntry = {
  uid: string;
  name: string;
  wagered: WageredData;
  wagerChange: number; // Added wagerChange property
};