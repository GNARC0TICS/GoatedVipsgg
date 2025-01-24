import { Table, TableHeader, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Trophy, ChevronLeft, ChevronRight, Clock, Calendar, CalendarDays, Search, Crown, Medal, Award, TrendingUp, Star } from "lucide-react";
import { useState, useMemo } from "react";
import { useLeaderboard, type TimePeriod } from "@/hooks/use-leaderboard";
import { getTierFromWager, getTierIcon } from "@/lib/tier-utils";
import { CircleDot } from 'lucide-react';
import { QuickProfile } from "@/components/QuickProfile";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { motion } from "framer-motion";

const ITEMS_PER_PAGE = 10;

export function LeaderboardTable() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('today');
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: leaderboardData, isLoading, error, metadata, refetch } = useLeaderboard();
  
  const leaderboardEntries = useMemo(() => {
    if (!leaderboardData?.data) return [];
    return leaderboardData.data[timePeriod === 'weekly' ? 'weekly' : 
                               timePeriod === 'monthly' ? 'monthly' : 
                               timePeriod === 'today' ? 'today' : 'all_time'].data;
  }, [leaderboardData, timePeriod]);

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
    const baseAnimation = {
      scale: [1, 1.1, 1],
      rotate: [-5, 5, -5, 5, 0],
      transition: { duration: 2, repeat: Infinity }
    };

    switch (rank) {
      case 1:
        return (
          <motion.div animate={baseAnimation}>
            <Crown className="h-8 w-8 text-yellow-400" />
          </motion.div>
        );
      case 2:
        return (
          <motion.div 
            animate={{ 
              scale: [1, 1.05, 1],
              transition: { duration: 2, repeat: Infinity }
            }}
          >
            <Medal className="h-7 w-7 text-gray-400" />
          </motion.div>
        );
      case 3:
        return (
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
              transition: { duration: 2, repeat: Infinity }
            }}
          >
            <Award className="h-7 w-7 text-amber-700" />
          </motion.div>
        );
      default:
        return <Star className="h-5 w-5 text-zinc-600" />;
    }
  };

  const totalPages = useMemo(() => {
    return Math.ceil((filteredData?.length || 0) / ITEMS_PER_PAGE);
  }, [filteredData]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse flex items-center p-4 bg-[#1A1B21]/50">
            <div className="h-10 w-10 bg-[#2A2B31] rounded-full"></div>
            <div className="ml-4 space-y-2 flex-1">
              <div className="h-4 bg-[#2A2B31] rounded w-1/4"></div>
              <div className="h-4 bg-[#2A2B31] rounded w-1/2"></div>
            </div>
          </div>
        ))}
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
      <div className="flex flex-col items-center justify-center mb-4 md:mb-6 text-center">
        <div>
          <motion.h2 
            key={timePeriod}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4 }}
            className="text-3xl md:text-5xl font-heading font-bold text-[#D7FF00] mb-2 tracking-tighter glow-text"
          >
            {timePeriod === 'today' && "TODAY"}
            {timePeriod === 'weekly' && "WEEKLY"}
            {timePeriod === 'monthly' && "MONTHLY"}
            {timePeriod === 'all_time' && "ALL TIME"}
          </motion.h2>
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <CircleDot className="h-4 w-4 text-red-500 animate-pulse" />
              <span className="text-[#D7FF00] font-heading tracking-tight glow-text">LIVE UPDATES</span>
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
              <motion.tr
                key={entry.uid}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="bg-[#1A1B21]/50 backdrop-blur-sm hover:bg-[#1A1B21] transition-colors"
                whileHover={{ 
                  backgroundColor: "rgba(26,27,33,0.8)",
                  scale: 1.02,
                  transition: { duration: 0.2 }
                }}
              >
                <TableCell className="font-heading">
                  <div className="flex items-center gap-2">
                    {getTrophyIcon(index + 1 + currentPage * ITEMS_PER_PAGE)}
                    {index + 1 + currentPage * ITEMS_PER_PAGE}
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
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-green-500 flex items-center gap-1"
                      >
                        <motion.div
                          animate={{ 
                            y: [0, -4, 0],
                          }}
                          transition={{ 
                            repeat: Infinity,
                            duration: 4,
                            repeatDelay: 2
                          }}
                        >
                          <TrendingUp className="h-4 w-4" />
                        </motion.div>
                        <motion.span 
                          className="text-xs font-bold"
                          animate={{ 
                            opacity: [1, 0.5, 1],
                            scale: [1, 1.05, 1]
                          }}
                          transition={{ 
                            repeat: Infinity,
                            duration: 4,
                            repeatDelay: 2
                          }}
                        >
                          +${entry.wagerChange.toLocaleString()}
                        </motion.span>
                      </motion.div>
                    )}
                  </div>
                </TableCell>
              </motion.tr>
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