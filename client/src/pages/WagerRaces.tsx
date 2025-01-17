import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trophy, CircleDot, Crown, Medal, Award, Star, Timer, TrendingUp } from "lucide-react";
import { CountdownTimer } from "@/components/CountdownTimer";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import { Card } from "@/components/ui/card";

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
};

export default function WagerRaces() {
  const [raceType] = useState<'weekly' | 'monthly' | 'weekend'>('monthly');
  const { data: leaderboardData, isLoading } = useLeaderboard('monthly');

  const prizePool = 200; 
  const prizeDistribution: Record<number, number> = {
    1: 0.50, // $100
    2: 0.15, // $30
    3: 0.10, // $20
    4: 0.0357, // ~$7.14
    5: 0.0357,
    6: 0.0357,
    7: 0.0357,
    8: 0.0357,
    9: 0.0357,
    10: 0.0358
  };

  const getTrophyIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-400 animate-pulse" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-700" />;
      default:
        return <Star className="h-5 w-5 text-zinc-600" />;
    }
  };

  const getWagerAmount = (player: LeaderboardEntry) => {
    switch (raceType) {
      case 'weekly':
        return player.wagered.this_week;
      case 'monthly':
        return player.wagered.this_month;
      default:
        return player.wagered.this_week;
    }
  };

  const getPrizeAmount = (rank: number) => {
    return Math.round(prizePool * (prizeDistribution[rank] || 0) * 100) / 100;
  };

  const calculatePoolPercentage = (player: LeaderboardEntry) => {
    const totalWagered = leaderboardData?.reduce((sum, p) => sum + (getWagerAmount(p) || 0), 0) || 1;
    const percentage = ((getWagerAmount(player) || 0) / totalWagered) * 100;
    return percentage.toFixed(2);
  };

  const isActivelyWagering = (player: LeaderboardEntry) => {
    // Mock implementation - in real app, this would compare with previous values
    return player.wagered.today > 0;
  };

  const top10Players = (leaderboardData || []).slice(0, 10);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#14151A] flex items-center justify-center">
        <div className="animate-spin text-[#D7FF00]">
          <Timer className="h-8 w-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#14151A] text-white">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="flex flex-col md:flex-row md:items-start justify-between mb-12 gap-4">
          <div>
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-4xl font-heading font-bold text-[#D7FF00] mb-2"
            >
              WAGER RACES
            </motion.h1>
            <div className="flex items-center gap-2">
              <CircleDot className="h-4 w-4 text-red-500 animate-pulse" />
              <span className="text-[#8A8B91]">Live Competition</span>
            </div>
          </div>

          {/* Quick view podium */}
          <div className="flex gap-2 justify-end w-full max-w-[420px]">
            {top10Players.slice(0, 3).map((player, index) => (
                <motion.div
                  key={player.uid}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`relative bg-[#1A1B21]/80 backdrop-blur-sm p-3 rounded-lg border ${
                    index === 0 ? 'border-[#FFD700]' : 
                    index === 1 ? 'border-[#C0C0C0]' : 
                    'border-[#CD7F32]'
                  } w-[130px]`}
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    {getTrophyIcon(index + 1)}
                  </div>
                  <div className="mt-3 text-center">
                    <p className="text-sm font-bold truncate">{player.name}</p>
                    <p className="text-xs text-[#D7FF00]">${getPrizeAmount(index + 1).toLocaleString()}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1A1B21]/50 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-[#2A2B31] hover:border-[#D7FF00]/50 transition-colors"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              <div>
                <h3 className="text-[#8A8B91] font-heading text-sm mb-2">PRIZE POOL</h3>
                <div className="flex items-baseline gap-2">
                  <Trophy className="h-5 w-5 text-[#D7FF00]" />
                  <p className="text-xl md:text-2xl font-bold">${prizePool.toLocaleString()}</p>
                </div>
              </div>
              <div>
                <h3 className="text-[#8A8B91] font-heading text-sm mb-2">TIME REMAINING</h3>
                <div className="flex items-baseline gap-2">
                  <Timer className="h-5 w-5 text-[#D7FF00]" />
                  <CountdownTimer endDate={new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString()} />
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <h3 className="text-[#8A8B91] font-heading text-sm mb-2">POSITIONS PAID</h3>
                <div className="flex items-baseline gap-2">
                  <Medal className="h-5 w-5 text-[#D7FF00]" />
                  <p className="text-xl md:text-2xl font-bold">10</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Rankings Table */}

          {/* Rankings Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1A1B21]/50 backdrop-blur-sm rounded-xl border border-[#2A2B31] overflow-hidden shadow-lg shadow-[#D7FF00]/5"
          >
            <div className="bg-[#2A2B31] px-6 py-4">
              <h3 className="text-xl font-heading font-bold text-[#D7FF00]">Leaderboard Rankings</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-20 font-heading text-[#D7FF00]">RANK</TableHead>
                    <TableHead className="font-heading text-[#D7FF00]">USERNAME</TableHead>
                    <TableHead className="text-right font-heading text-[#D7FF00]">TOTAL WAGER</TableHead>
                    <TableHead className="text-right font-heading text-[#D7FF00]">POOL %</TableHead>
                    <TableHead className="text-right font-heading text-[#D7FF00]">PRIZE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {top10Players.map((player, index) => (
                      <motion.tr
                        key={player.uid}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`bg-[#1A1B21]/50 backdrop-blur-sm hover:bg-[#1A1B21] ${
                          index < 3 ? 'bg-[#1A1B21]/70' : ''
                        }`}
                      >
                        <TableCell className="font-heading text-white">
                          <div className="flex items-center gap-2">
                            {getTrophyIcon(index + 1)}
                            {index + 1}
                          </div>
                        </TableCell>
                        <TableCell className="font-sans text-white">
                          {player.name}
                        </TableCell>
                        <TableCell className="text-right font-sans text-white">
                          <div className="flex items-center justify-end gap-2">
                            ${getWagerAmount(player)?.toLocaleString()}
                            {isActivelyWagering(player) && (
                              <TrendingUp className="h-4 w-4 text-green-400 animate-pulse" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-sans text-white">
                          {calculatePoolPercentage(player)}%
                        </TableCell>
                        <TableCell className="text-right font-sans text-[#D7FF00]">
                          ${getPrizeAmount(index + 1).toLocaleString()}
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          </motion.div>

          {/* Disclaimer Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 p-6 bg-[#1A1B21]/50 backdrop-blur-sm rounded-xl border border-[#2A2B31]"
          >
            <h3 className="text-xl font-heading font-bold text-[#D7FF00] mb-4">How It Works</h3>
            <div className="space-y-4 text-[#8A8B91]">
              <p>
                The Wager Race is a monthly competition where affiliates compete for a share of the ${prizePool} prize pool.
                Rankings are determined by the total amount wagered through your affiliate links during the competition period.
              </p>
              <p>
                The top 10 affiliates will receive prizes according to their final ranking, with the following distribution:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>1st Place: 50% (${getPrizeAmount(1)})</li>
                <li>2nd Place: 15% (${getPrizeAmount(2)})</li>
                <li>3rd Place: 10% (${getPrizeAmount(3)})</li>
                <li>4th-10th Place: Split remaining 25%</li>
              </ul>
              <p className="font-semibold text-white">
                Prize payments will be processed and distributed within 24 hours of the competition's end.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}