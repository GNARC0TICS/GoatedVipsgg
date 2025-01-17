import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trophy, CircleDot, Crown, Medal, Award, Star, Timer } from "lucide-react";
import { CountdownTimer } from "@/components/CountdownTimer";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import { Progress } from "@/components/ui/progress";

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
    1: 0.50, 
    2: 0.15, 
    3: 0.10, 
    4: 0.0357, 
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

  const top10Players = (leaderboardData || []).slice(0, 10);
  const maxWager = Math.max(...(top10Players.map(p => getWagerAmount(p) || 0)));

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
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-heading font-bold text-[#D7FF00] mb-2"
            >
              WAGER RACES
            </motion.h1>
            <div className="flex items-center gap-2">
              <CircleDot className="h-4 w-4 text-red-500 animate-pulse" />
              <span className="text-[#8A8B91]">Live Competition</span>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1A1B21]/50 backdrop-blur-sm p-6 rounded-xl border border-[#2A2B31] hover:border-[#D7FF00]/50 transition-colors"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-[#8A8B91] font-heading text-sm mb-2">PRIZE POOL</h3>
                <div className="flex items-baseline gap-2">
                  <Trophy className="h-5 w-5 text-[#D7FF00]" />
                  <p className="text-2xl font-bold">${prizePool.toLocaleString()}</p>
                </div>
              </div>
              <div>
                <h3 className="text-[#8A8B91] font-heading text-sm mb-2">TIME REMAINING</h3>
                <div className="flex items-baseline gap-2">
                  <Timer className="h-5 w-5 text-[#D7FF00]" />
                  <CountdownTimer endDate={new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString()} />
                </div>
              </div>
              <div>
                <h3 className="text-[#8A8B91] font-heading text-sm mb-2">PARTICIPANTS</h3>
                <div className="flex items-baseline gap-2">
                  <Medal className="h-5 w-5 text-[#D7FF00]" />
                  <p className="text-2xl font-bold">{top10Players.length}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {top10Players.slice(0, 3).map((player, index) => (
              <motion.div
                key={player.uid}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative bg-[#1A1B21]/50 backdrop-blur-sm p-6 rounded-xl border border-[#2A2B31] hover:border-[#D7FF00]/50 transition-colors ${
                  index === 0 ? 'md:scale-105 z-10' : ''
                }`}
              >
                <div className="absolute top-0 right-0 -mt-4 -mr-4">
                  {getTrophyIcon(index + 1)}
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xl font-bold">{player.name}</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[#8A8B91] mb-1">Total Wager</p>
                    <p className="text-xl">${getWagerAmount(player)?.toLocaleString()}</p>
                    <Progress 
                      value={(getWagerAmount(player) || 0) / maxWager * 100} 
                      className="mt-2 bg-[#2A2B31]" 
                    />
                  </div>
                  <div>
                    <p className="text-[#8A8B91] mb-1">Prize</p>
                    <p className="text-xl text-[#D7FF00]">
                      ${getPrizeAmount(index + 1).toLocaleString()}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1A1B21]/50 backdrop-blur-sm rounded-xl border border-[#2A2B31] overflow-hidden"
          >
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-20 font-heading text-[#D7FF00]">RANK</TableHead>
                  <TableHead className="font-heading text-[#D7FF00]">USERNAME</TableHead>
                  <TableHead className="text-right font-heading text-[#D7FF00]">TOTAL WAGER</TableHead>
                  <TableHead className="text-right font-heading text-[#D7FF00]">PRIZE</TableHead>
                  <TableHead className="text-right font-heading text-[#D7FF00]">PROGRESS</TableHead>
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
                        ${getWagerAmount(player)?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-sans text-[#D7FF00]">
                        ${getPrizeAmount(index + 1).toLocaleString()}
                      </TableCell>
                      <TableCell className="w-32">
                        <Progress 
                          value={(getWagerAmount(player) || 0) / maxWager * 100} 
                          className="bg-[#2A2B31]"
                        />
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </motion.div>
        </div>
      </div>
    </div>
  );
}