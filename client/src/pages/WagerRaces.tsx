import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trophy, CircleDot } from "lucide-react";
import { CountdownTimer } from "@/components/CountdownTimer";

const defaultRaceData = {
  id: "monthly-1",
  type: "monthly",
  status: "live",
  prizePool: 10000,
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
  participants: [
    { rank: 1, username: "Player1", wager: 50000, prizeShare: 0.25 },
    { rank: 2, username: "Player2", wager: 45000, prizeShare: 0.15 },
    { rank: 3, username: "Player3", wager: 40000, prizeShare: 0.10 },
    { rank: 4, username: "Player4", wager: 35000, prizeShare: 0.075 },
    { rank: 5, username: "Player5", wager: 30000, prizeShare: 0.075 },
    { rank: 6, username: "Player6", wager: 25000, prizeShare: 0.075 },
    { rank: 7, username: "Player7", wager: 20000, prizeShare: 0.075 },
    { rank: 8, username: "Player8", wager: 15000, prizeShare: 0.05 },
    { rank: 9, username: "Player9", wager: 10000, prizeShare: 0.05 },
    { rank: 10, username: "Player10", wager: 5000, prizeShare: 0.05 },
  ],
};

export default function WagerRaces() {
  const [raceType] = useState("monthly");
  const raceData = defaultRaceData;

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

          <div className="flex flex-wrap gap-2">
            <Button
              variant="default"
              className="font-heading flex-1 md:flex-none"
            >
              MONTHLY
            </Button>
          </div>
        </div>

        <div className="space-y-8">
          {/* Race Info */}
          <div className="bg-[#1A1B21]/50 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-[#2A2B31]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-[#8A8B91] font-heading text-sm mb-2">PRIZE POOL</h3>
                <p className="text-2xl font-bold">${raceData.prizePool.toLocaleString()}</p>
              </div>
              <div>
                <h3 className="text-[#8A8B91] font-heading text-sm mb-2">TIME REMAINING</h3>
                <CountdownTimer endDate={raceData.endDate} />
              </div>
              <div>
                <h3 className="text-[#8A8B91] font-heading text-sm mb-2">PARTICIPANTS</h3>
                <p className="text-2xl font-bold">{raceData.participants.length}</p>
              </div>
            </div>
          </div>

          {/* Top 3 Winners */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {raceData.participants.slice(0, 3).map((participant) => (
              <div key={participant.rank} className="bg-[#1A1B21]/50 backdrop-blur-sm p-6 rounded-xl border border-[#2A2B31]">
                <div className="flex items-center gap-3 mb-4">
                  {getTrophyIcon(participant.rank)}
                  <span className="text-xl font-bold">{participant.username}</span>
                </div>
                <div className="space-y-2">
                  <p className="text-[#8A8B91]">Total Wager</p>
                  <p className="text-xl">${participant.wager.toLocaleString()}</p>
                  <p className="text-[#8A8B91]">Prize</p>
                  <p className="text-xl text-[#D7FF00]">
                    ${(raceData.prizePool * participant.prizeShare).toLocaleString()}
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
                  {raceData.participants.map((participant) => (
                    <motion.tr
                      key={participant.username}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="bg-[#1A1B21]/50 backdrop-blur-sm hover:bg-[#1A1B21]"
                    >
                      <TableCell className="font-heading text-white">
                        <div className="flex items-center gap-2">
                          {getTrophyIcon(participant.rank)}
                          {participant.rank}
                        </div>
                      </TableCell>
                      <TableCell className="font-sans text-white">
                        {participant.username}
                      </TableCell>
                      <TableCell className="text-right font-sans text-white">
                        ${participant.wager.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-sans text-[#D7FF00]">
                        ${(raceData.prizePool * participant.prizeShare).toLocaleString()}
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