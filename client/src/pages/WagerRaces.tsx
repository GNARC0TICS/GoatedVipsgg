import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trophy, CircleDot } from "lucide-react";
import { CountdownTimer } from "@/components/CountdownTimer";
import { useLeaderboard } from "@/hooks/use-leaderboard";

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

  const prizePool = 200; // Total prize pool of $200
  const prizeDistribution: Record<number, number> = {
    1: 0.50, // $100 (50% of total)
    2: 0.15, // $30 (15% of total)
    3: 0.10, // $20 (10% of total)
    4: 0.0357, // ~$7.14 each (remaining $50 split among places 4-10)
    5: 0.0357,
    6: 0.0357,
    7: 0.0357,
    8: 0.0357,
    9: 0.0357,
    10: 0.0358 // Slightly higher to round up to $50 total for places 4-10
  };

  const getTrophyIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-400" />;
      case 2:
        return <Trophy className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Trophy className="h-6 w-6 text-amber-700" />;
      default:
        return null;
    }
  };

  // Get wager amount based on race type
  const getWagerAmount = (player: LeaderboardEntry) => {
    switch (raceType) {
      case 'weekly':
        return player.wagered.this_week;
      case 'monthly':
        return player.wagered.this_month;
      default:
        return player.wagered.this_week; // Default to weekly for weekend races
    }
  };

  const getPrizeAmount = (rank: number) => {
    return Math.round(prizePool * (prizeDistribution[rank] || 0) * 100) / 100;
  };

  const top10Players = (leaderboardData || []).slice(0, 10);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#14151A] text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-heading font-bold text-[#D7FF00] mb-2">WAGER RACES</h1>
            <div className="flex items-center gap-2">
              <CircleDot className="h-4 w-4 text-red-500 animate-pulse" />
              <span className="text-[#8A8B91]">Live Updates</span>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Race Info */}
          <div className="bg-[#1A1B21]/50 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-[#2A2B31]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-[#8A8B91] font-heading text-sm mb-2">PRIZE POOL</h3>
                <p className="text-2xl font-bold">${prizePool.toLocaleString()}</p>
              </div>
              <div>
                <h3 className="text-[#8A8B91] font-heading text-sm mb-2">TIME REMAINING</h3>
                <CountdownTimer endDate={new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString()} />
              </div>
              <div>
                <h3 className="text-[#8A8B91] font-heading text-sm mb-2">PARTICIPANTS</h3>
                <p className="text-2xl font-bold">{top10Players.length}</p>
              </div>
            </div>
          </div>

          {/* Top 3 Winners */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {top10Players.slice(0, 3).map((player, index) => (
              <div key={player.uid} className="bg-[#1A1B21]/50 backdrop-blur-sm p-6 rounded-xl border border-[#2A2B31]">
                <div className="flex items-center gap-3 mb-4">
                  {getTrophyIcon(index + 1)}
                  <span className="text-xl font-bold">{player.name}</span>
                </div>
                <div className="space-y-2">
                  <p className="text-[#8A8B91]">Total Wager</p>
                  <p className="text-xl">${getWagerAmount(player)?.toLocaleString()}</p>
                  <p className="text-[#8A8B91]">Prize</p>
                  <p className="text-xl text-[#D7FF00]">
                    ${getPrizeAmount(index + 1).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Leaderboard */}
          <div className="bg-[#1A1B21]/50 backdrop-blur-sm rounded-xl border border-[#2A2B31] overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20 font-heading text-[#D7FF00]">RANK</TableHead>
                  <TableHead className="font-heading text-[#D7FF00]">USERNAME</TableHead>
                  <TableHead className="text-right font-heading text-[#D7FF00]">TOTAL WAGER</TableHead>
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
                      className="bg-[#1A1B21]/50 backdrop-blur-sm hover:bg-[#1A1B21]"
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
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}