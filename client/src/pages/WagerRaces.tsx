import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trophy, CircleDot, Crown, Medal, Award, Star, Timer, TrendingUp } from "lucide-react";
import { CountdownTimer } from "@/components/CountdownTimer";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { QuickProfile } from "@/components/QuickProfile";
import { Link } from "wouter";

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
        return <Crown className="h-8 w-8 text-yellow-400 animate-pulse" />;
      case 2:
        return <Medal className="h-7 w-7 text-gray-400" />;
      case 3:
        return <Award className="h-7 w-7 text-amber-700" />;
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

  if (isLoading || !leaderboardData) {
    return (
      <div className="min-h-screen bg-[#14151A] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const top10Players = (leaderboardData || []).slice(0, 10);
  const currentLeader = top10Players[0];

  return (
    <div className="min-h-screen bg-[#14151A] text-white">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="flex flex-col gap-8">
          {/* Header Section */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex justify-between items-center">
                  <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl md:text-4xl font-heading font-bold text-[#D7FF00] mb-2"
                  >
                    {`${raceType.charAt(0).toUpperCase() + raceType.slice(1)} Wager Race`}
                  </motion.h1>
                  <Button
                    variant="outline"
                    className="border-[#D7FF00] text-[#D7FF00] hover:bg-[#D7FF00] hover:text-black"
                    onClick={() => window.location.href = '/how-it-works'}
                  >
                    How it Works
                  </Button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <CircleDot className="h-4 w-4 text-red-500 animate-pulse" />
                    <span className="text-[#8A8B91]">Live Competition</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#8A8B91]">
                    <Timer className="h-4 w-4 text-[#D7FF00]" />
                    <span>Ends in: </span>
                    <CountdownTimer endDate={new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString()} />
                  </div>
                </div>
              </div>
            </div>

            {/* Info Boxes */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full bg-[#1A1B21]/50 backdrop-blur-sm rounded-lg border border-[#2A2B31] p-4"
            >
              <div className="grid grid-cols-3 gap-8">
                <div className="text-center">
                  <h3 className="text-[#8A8B91] font-heading text-sm mb-2">PRIZE POOL</h3>
                  <div className="flex items-center justify-center gap-2">
                    <Trophy className="h-5 w-5 text-[#D7FF00]" />
                    <p className="text-xl font-bold">${prizePool.toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-[#8A8B91] font-heading text-sm mb-2">POSITIONS PAID</h3>
                  <div className="flex items-center justify-center gap-2">
                    <Medal className="h-5 w-5 text-[#D7FF00]" />
                    <p className="text-xl font-bold">10</p>
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-[#8A8B91] font-heading text-sm mb-2">CURRENT LEADER</h3>
                  <div className="flex items-center justify-center gap-2">
                    <Crown className="h-5 w-5 text-[#D7FF00]" />
                    <p className="text-xl font-bold truncate">{currentLeader?.name || 'No Leader'}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Podium Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center py-16 px-4 mb-12"
          >
            <div className="flex justify-center items-end gap-6 md:gap-8">
              {/* 2nd Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                className="relative bg-gradient-to-b from-[#1A1B21]/90 to-[#1A1B21]/70 backdrop-blur-sm p-6 rounded-2xl border-2 border-[#C0C0C0] w-[180px] h-[180px] transform -translate-y-4"
              >
                <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                  <span className="bg-[#C0C0C0] text-black font-heading px-6 py-2 rounded-full text-sm whitespace-nowrap">2ND PLACE</span>
                </div>
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 filter drop-shadow-lg">
                  {getTrophyIcon(2)}
                </div>
                <div className="text-center mt-8">
                  <p className="text-base font-bold truncate text-white/90">{top10Players[1]?.name || '-'}</p>
                  <p className="text-sm font-heading text-[#D7FF00] mt-2">
                    ${getPrizeAmount(2).toLocaleString()}
                  </p>
                  <p className="text-xs text-white/60 mt-1">
                    ${getWagerAmount(top10Players[1] || { wagered: { this_month: 0 } }).toLocaleString()} wagered
                  </p>
                </div>
              </motion.div>

              {/* 1st Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                className="relative bg-gradient-to-b from-[#1A1B21]/90 to-[#1A1B21]/70 backdrop-blur-sm p-6 rounded-2xl border-2 border-[#FFD700] w-[220px] h-[200px] z-10 glow-gold"
              >
                <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                  <span className="bg-[#FFD700] text-black font-heading px-6 py-2 rounded-full text-sm whitespace-nowrap">1ST PLACE</span>
                </div>
                {getTrophyIcon(1)}
                <div className="text-center mt-4">
                  <p className="text-xl font-bold truncate text-white">{top10Players[0]?.name || '-'}</p>
                  <p className="text-lg font-heading text-[#D7FF00] mt-2">
                    ${getPrizeAmount(1).toLocaleString()}
                  </p>
                  <p className="text-sm text-white/60 mt-1">
                    ${getWagerAmount(top10Players[0] || { wagered: { this_month: 0 } }).toLocaleString()} wagered
                  </p>
                </div>
              </motion.div>

              {/* 3rd Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                className="relative bg-gradient-to-b from-[#1A1B21]/90 to-[#1A1B21]/70 backdrop-blur-sm p-6 rounded-2xl border-2 border-[#CD7F32] w-[180px] h-[160px] transform -translate-y-8"
              >
                <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                  <span className="bg-[#CD7F32] text-black font-heading px-6 py-2 rounded-full text-sm whitespace-nowrap">3RD PLACE</span>
                </div>
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 filter drop-shadow-lg">
                  {getTrophyIcon(3)}
                </div>
                <div className="text-center mt-8">
                  <p className="text-base font-bold truncate text-white/90">{top10Players[2]?.name || '-'}</p>
                  <p className="text-sm font-heading text-[#D7FF00] mt-2">
                    ${getPrizeAmount(3).toLocaleString()}
                  </p>
                  <p className="text-xs text-white/60 mt-1">
                    ${getWagerAmount(top10Players[2] || { wagered: { this_month: 0 } }).toLocaleString()} wagered
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Rankings Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1A1B21]/50 backdrop-blur-sm rounded-xl border border-[#2A2B31] overflow-hidden mt-4"
          > {/* Added mt-4 to move the table up */}
            <div className="bg-[#2A2B31] px-6 py-4">
              <h3 className="text-xl font-heading font-bold text-[#D7FF00]">{`${raceType.charAt(0).toUpperCase() + raceType.slice(1)} Race Leaderboard`}</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-20 font-heading text-[#D7FF00]">RANK</TableHead>
                  <TableHead className="font-heading text-[#D7FF00]">USERNAME</TableHead>
                  <TableHead className="text-right font-heading text-[#D7FF00]">TOTAL WAGER</TableHead>
                  <TableHead className="text-right font-heading text-[#D7FF00]">PRIZE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top10Players.map((player, index) => (
                  <TableRow key={player.uid} className="bg-[#1A1B21]/50 backdrop-blur-sm hover:bg-[#1A1B21]">
                    <TableCell className="font-heading">
                      <div className="flex items-center gap-2">
                        {getTrophyIcon(index + 1)}
                        {index + 1}
                      </div>
                    </TableCell>
                    <TableCell className="font-sans text-white">
                      <QuickProfile userId={player.uid} username={player.name}>
                        {player.name}
                      </QuickProfile>
                    </TableCell>
                    <TableCell className="text-right font-sans">
                      ${getWagerAmount(player)?.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-sans text-[#D7FF00]">
                      ${getPrizeAmount(index + 1).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </motion.div>
        </div>
      </div>
    </div>
  );
}