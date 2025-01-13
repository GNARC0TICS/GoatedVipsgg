import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trophy, CircleDot } from "lucide-react";
import { CountdownTimer } from "@/components/CountdownTimer";

type RaceType = 'weekly' | 'monthly' | 'weekend';
type RaceStatus = 'live' | 'completed' | 'upcoming';

interface WagerRace {
  id: string;
  type: RaceType;
  status: RaceStatus;
  prizePool: number;
  startDate: string;
  endDate: string;
  participants: Array<{
    rank: number;
    username: string;
    wager: number;
    prizeShare: number;
  }>;
}

export default function WagerRaces() {
  const [raceType, setRaceType] = useState<RaceType>('weekly');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [raceData, setRaceData] = useState<WagerRace | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const websocket = new WebSocket(`${protocol}//${window.location.host}/ws/wager-races`);

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setRaceData(data);
      } catch (error) {
        console.error('Error parsing websocket data:', error);
      }
    };

    websocket.onclose = () => {
      console.log('WebSocket connection closed. Attempting to reconnect...');
      setTimeout(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        setWs(new WebSocket(`${protocol}//${window.location.host}/ws/wager-races`));
      }, 1000);
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, []);

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
              variant={raceType === 'weekly' ? 'default' : 'outline'}
              onClick={() => setRaceType('weekly')}
              className="font-heading flex-1 md:flex-none"
            >
              WEEKLY
            </Button>
            <Button
              variant={raceType === 'monthly' ? 'default' : 'outline'}
              onClick={() => setRaceType('monthly')}
              className="font-heading flex-1 md:flex-none"
            >
              MONTHLY
            </Button>
            <Button
              variant={raceType === 'weekend' ? 'default' : 'outline'}
              onClick={() => setRaceType('weekend')}
              className="font-heading flex-1 md:flex-none"
            >
              WEEKEND
            </Button>
          </div>
        </div>

        {raceData ? (
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

            {/* Prize Distribution Info */}
            <div className="bg-[#1A1B21]/50 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-[#2A2B31]">
              <h3 className="font-heading text-xl mb-4">Prize Distribution</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <h4 className="text-[#8A8B91] text-sm mb-1">1st Place</h4>
                  <p className="text-lg font-bold">25%</p>
                </div>
                <div>
                  <h4 className="text-[#8A8B91] text-sm mb-1">2nd Place</h4>
                  <p className="text-lg font-bold">15%</p>
                </div>
                <div>
                  <h4 className="text-[#8A8B91] text-sm mb-1">3rd Place</h4>
                  <p className="text-lg font-bold">10%</p>
                </div>
                <div>
                  <h4 className="text-[#8A8B91] text-sm mb-1">4th-7th Place</h4>
                  <p className="text-lg font-bold">7.5% each</p>
                </div>
                <div>
                  <h4 className="text-[#8A8B91] text-sm mb-1">8th-10th Place</h4>
                  <p className="text-lg font-bold">5% each</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <CircleDot className="h-8 w-8 text-red-500 animate-pulse mx-auto mb-4" />
              <p className="text-[#8A8B91]">Connecting to live wager races...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}