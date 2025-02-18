import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { queryClient } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  CircleDot,
  Crown,
  Medal,
  Award,
  Star,
  Timer,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { CountdownTimer } from "@/components/CountdownTimer";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { QuickProfile } from "@/components/QuickProfile";
import { Link } from "wouter";
import { getTierFromWager, getTierIcon } from "@/lib/tier-utils";

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
  lastUpdate?: string;
};

import { PageTransition } from "@/components/PageTransition";

export default function WagerRaces() {
  const [raceType] = useState<"weekly" | "monthly" | "weekend">("monthly");
  const [showCompletedRace, setShowCompletedRace] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const { data: leaderboardData, isLoading } = useLeaderboard("monthly");

  useEffect(() => {
    ws.current = new WebSocket(`wss://${window.location.hostname}/ws`);

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);
  const { data: previousRace } = useQuery<any>({
    queryKey: ["/api/wager-races/previous"],
    enabled: showCompletedRace,
    staleTime: Infinity,
    select: (data) => {
      if (!data) return null;

      const transitionEnds = new Date(data.metadata?.transitionEnds);
      const now = new Date();

      // Auto-hide completed race view after transition period
      if (transitionEnds < now && showCompletedRace) {
        setTimeout(() => setShowCompletedRace(false), 1000);
      }

      return {
        ...data,
        participants: data.participants?.map((p: any) => ({
          ...p,
          wagered: {
            this_month: p.wagered || 0,
            today: 0,
            this_week: 0,
            all_time: p.allTimeWagered || 0
          }
        })),
        isTransition: now < transitionEnds
      };
    }
  });

  // Auto-show completed race when race ends
  useEffect(() => {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    if (now >= endOfMonth && !showCompletedRace) {
      setShowCompletedRace(true);
    }
  }, []);

  useEffect(() => {
    // Listen for race completion events
    const handleRaceComplete = (event: any) => {
      if (event.type === "RACE_COMPLETED") {
        setShowCompletedRace(true);
        // Auto-hide after 1 hour
        setTimeout(() => setShowCompletedRace(false), 3600000);
      }
    };

    // Add WebSocket listener
    if (ws?.current) {
      ws.current.addEventListener("message", handleRaceComplete);
    }

    return () => {
      if (ws?.current) {
        ws.current.removeEventListener("message", handleRaceComplete);
      }
    };
  }, []);

  const prizePool = 500;
  const prizeDistribution: Record<number, number> = {
    1: 0.425, // $212.50
    2: 0.2,   // $100
    3: 0.15,  // $60
    4: 0.075, // $30
    5: 0.06,  // $24
    6: 0.04,  // $16
    7: 0.0275, // $11
    8: 0.0225, // $9
    9: 0.0175, // $7
    10: 0.0175, // $7
  };

  const getLastUpdateTime = (timestamp?: string) => {
  if (!timestamp) return 'recently';
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
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
      case "weekly":
        return player.wagered.this_week;
      case "monthly":
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

  const top10Players = showCompletedRace
    ? (previousRace?.data?.participants || [])
    : (leaderboardData || []).slice(0, 10);
  const currentLeader = top10Players[0];

  return (
    <div className="min-h-screen bg-[#14151A] text-white">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="flex flex-col gap-8">
          {/* Header Section */}
          <div className="relative">
            <div className="absolute inset-0 opacity-50">
              <video
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                poster="/images/race.gif"
                ref={(el) => {
                  if (el) {
                    el.playbackRate = 0.5;
                    el.addEventListener('ended', () => {
                      setTimeout(() => {
                        el.play();
                      }, 1000); // 1 second pause before replay
                    });
                  }
                }}
              >
                <source src="/images/RACEFLAG.MP4" type="video/mp4" />
              </video>
            </div>
            <div className="relative z-10 py-12 px-4 text-center">
              <div className="flex justify-center gap-4 mb-8">
                <Button
                  variant="secondary"
                  className="bg-[#1A1B21]/80 hover:bg-[#1A1B21]"
                >
                  This month
                </Button>
                {/* Previous month button will be enabled for next race */}
                {/* <Button
                  variant="ghost"
                  className={`text-[#8A8B91] hover:text-white ${showCompletedRace ? 'text-white' : ''}`}
                  onClick={() => setShowCompletedRace(!showCompletedRace)}
                >
                  {showCompletedRace ? "Current month" : "Previous month"}
                </Button> */}
              </div>

              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center"
                >
                  <h1 className="text-6xl font-heading font-extrabold text-white mb-2 uppercase tracking-tighter font-mona-sans-expanded">
                    $500
                  </h1>
                  <h2 className="text-5xl font-heading font-extrabold text-[#D7FF00] leading-tight uppercase tracking-tighter font-mona-sans-expanded">
                    Monthly
                    <br />
                    Race
                  </h2>
                </motion.div>

                <div className="flex flex-col items-center gap-6 mt-8">
                  {/* Race Status */}
                  {showCompletedRace ? (
                    <div className="space-y-2">
                      <div className="bg-[#D7FF00]/10 text-[#D7FF00] px-6 py-2 rounded-full border border-[#D7FF00] backdrop-blur-sm">
                        Race Completed
                      </div>
                      <div className="bg-[#1A1B21]/80 text-[#D7FF00]/80 px-6 py-3 rounded-lg text-sm">
                        Winners will receive their prizes directly to their Goated account within 24 hours of race completion
                      </div>
                    </div>
                  ) : leaderboardData?.status === 'transition' ? (
                    <div className="bg-orange-500/10 text-orange-500 px-6 py-2 rounded-full border border-orange-500 backdrop-blur-sm">
                      In Transition Period
                    </div>
                  ) : (
                    <div className="bg-[#1A1B21]/80 backdrop-blur-sm px-6 py-4 rounded-lg">
                      <div className="text-4xl font-bold text-[#D7FF00]">
                        <CountdownTimer
                          endDate={new Date(
                            new Date().getFullYear(),
                            new Date().getMonth(), // Current month (February)
                            new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate(), // Last day of February
                            23,
                            59,
                            59
                          ).toISOString()}
                          large={true}
                          onComplete={() => setShowCompletedRace(true)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Next Race Countdown */}
                  {(showCompletedRace || leaderboardData?.status === 'transition') && (
                    <div className="text-center">
                      <div className="text-[#8A8B91] mb-2">Next Race Starts In</div>
                      <div className="bg-[#1A1B21]/80 backdrop-blur-sm px-6 py-4 rounded-lg">
                        <CountdownTimer
                          endDate={new Date(
                            new Date().getFullYear(),
                            new Date().getMonth() + 1, // Next month (March)
                            1,
                            0,
                            0,
                            0
                          ).toISOString()}
                          large={true}
                        />
                      </div>
                    </div>
                  )}
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
                  <h3 className="text-[#8A8B91] font-heading text-sm mb-2">
                    PRIZE POOL
                  </h3>
                  <div className="flex items-center justify-center gap-2">
                    <Trophy className="h-5 w-5 text-[#D7FF00]" />
                    <p className="text-xl font-bold">
                      $500
                    </p>
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-[#8A8B91] font-heading text-sm mb-2">
                    POSITIONS PAID
                  </h3>
                  <div className="flex items-center justify-center gap-2">
                    <Medal className="h-5 w-5 text-[#D7FF00]" />
                    <p className="text-xl font-bold">10</p>
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-[#8A8B91] font-heading text-sm mb-2">
                    1ST PLACE
                  </h3>
                  <div className="flex items-center justify-center gap-2">
                    <Crown className="h-5 w-5 text-[#D7FF00]" />
                    <p className="text-xl font-bold truncate">
                      {currentLeader?.name || "No Leader"}
                    </p>
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
            <div className="flex justify-center items-end gap-2 md:gap-8 px-2 md:px-0">
              {/* 2nd Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ 
                  scale: 1.05,
                  transition: { duration: 0.2 },
                  boxShadow: "0 0 20px rgba(215, 255, 0, 0.2)"
                }}
                className="relative bg-gradient-to-b from-[#1A1B21]/90 to-[#1A1B21]/70 backdrop-blur-sm p-3 md:p-6 rounded-2xl border-2 border-[#C0C0C0] w-[120px] md:w-[180px] h-[180px] md:h-[220px] transform -translate-y-4"
              >
                <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                  <span className="bg-[#C0C0C0] text-black font-heading px-6 py-2 rounded-full text-sm whitespace-nowrap">
                    2ND PLACE
                  </span>
                </div>
                <div className="relative pt-4">
                  <div className="flex justify-center mb-2">
                    {getTrophyIcon(2)}
                  </div>
                  <div className="text-center">
                    <QuickProfile userId={top10Players[1]?.uid} username={top10Players[1]?.name}>
                      <p className="text-base md:text-lg font-bold truncate text-white/90 cursor-pointer hover:text-[#D7FF00] transition-colors">
                        {top10Players[1]?.name || "-"}
                      </p>
                    </QuickProfile>
                    <p className="text-sm md:text-base font-heading text-[#D7FF00] mt-2">
                      ${getPrizeAmount(2).toLocaleString()}
                    </p>
                    <p className="text-sm text-white/60 mt-1 flex items-center justify-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      ${getWagerAmount(
                        top10Players[1] || { wagered: { this_month: 0 } },
                      ).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-white/40 mt-1">
                      Updated {getLastUpdateTime(top10Players[1]?.lastUpdate)}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* 1st Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ 
                  scale: 1.05,
                  transition: { duration: 0.2 },
                  boxShadow: "0 0 20px rgba(215, 255, 0, 0.2)"
                }}
                className="relative bg-gradient-to-b from-[#1A1B21]/90 to-[#1A1B21]/70 backdrop-blur-sm p-3 md:p-6 rounded-2xl border-2 border-[#FFD700] w-[140px] md:w-[220px] h-[200px] md:h-[240px] z-10 glow-gold"
              >
                <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                  <span className="bg-[#FFD700] text-black font-heading px-6 py-2 rounded-full text-sm whitespace-nowrap">
                    1ST PLACE
                  </span>
                </div>
                <div className="relative pt-4">
                  <div className="flex justify-center mb-2">
                    {getTrophyIcon(1)}
                  </div>
                  <div className="text-center">
                  <QuickProfile userId={top10Players[0]?.uid} username={top10Players[0]?.name}>
                    <p className="text-xl font-bold truncate text-white cursor-pointer hover:text-[#D7FF00] transition-colors">
                      {top10Players[0]?.name || "-"}
                    </p>
                  </QuickProfile>
                  <p className="text-lg font-heading text-[#D7FF00] mt-2">
                    ${getPrizeAmount(1).toLocaleString()}
                  </p>
                  <p className="text-sm text-white/60 mt-1">
                    $
                    {getWagerAmount(
                      top10Players[0] || { wagered: { this_month: 0 } },
                    ).toLocaleString()}{" "}
                    wagered
                  </p>
                  </div>
                </div>
              </motion.div>


              {/* 3rd Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ 
                  scale: 1.05,
                  transition: { duration: 0.2 },
                  boxShadow: "0 0 20px rgba(215, 255, 0, 0.2)"
                }}
                className="relative bg-gradient-to-b from-[#1A1B21]/90 to-[#1A1B21]/70 backdrop-blur-sm p-3 md:p-6 rounded-2xl border-2 border-[#CD7F32] w-[120px] md:w-[180px] h-[160px] md:h-[200px] transform -translate-y-8"
              >
                <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                  <span className="bg-[#CD7F32] text-black font-heading px-6 py-2 rounded-full text-sm whitespace-nowrap">
                    3RD PLACE
                  </span>
                </div>
                <div className="relative pt-4">
                  <div className="flex justify-center mb-2">
                    {getTrophyIcon(3)}
                  </div>
                  <div className="text-center">
                    <QuickProfile userId={top10Players[2]?.uid} username={top10Players[2]?.name}>
                      <p className="text-base md:text-lg font-bold truncate text-white/90 cursor-pointer hover:text-[#D7FF00] transition-colors">
                        {top10Players[2]?.name || "-"}
                      </p>
                    </QuickProfile>
                    <p className="text-sm md:text-base font-heading text-[#D7FF00] mt-1">
                      ${getPrizeAmount(3).toLocaleString()}
                    </p>
                    <p className="text-sm text-white/60 mt-1 flex items-center justify-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      ${getWagerAmount(
                        top10Players[2] || { wagered: { this_month: 0 } },
                      ).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-white/40 mt-1">
                      Updated {getLastUpdateTime(top10Players[2]?.lastUpdate)}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Rankings Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1A1B21]/50 backdrop-blur-sm rounded-xl border border-[#2A2B31] overflow-hidden mt-4"
          >
            <div className="bg-[#2A2B31] px-6 py-4">
              <h3 className="text-xl font-heading font-bold text-[#D7FF00] text-center">
                {`${raceType.charAt(0).toUpperCase() + raceType.slice(1)} Race Leaderboard`}
              </h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-20 font-heading text-[#D7FF00]">
                    RANK
                  </TableHead>
                  <TableHead className="font-heading text-[#D7FF00]">
                    USERNAME
                  </TableHead>
                  <TableHead className="text-right font-heading text-[#D7FF00]">
                    TOTAL WAGER
                  </TableHead>
                  <TableHead className="text-right font-heading text-[#D7FF00]">
                    PRIZE
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(showCompletedRace ? (previousRace?.data?.participants || []).slice(0, 10) : top10Players).map((player: LeaderboardEntry, index: number) => (
                  <TableRow
                    key={player.uid}
                    className="bg-[#1A1B21]/50 backdrop-blur-sm hover:bg-[#1A1B21]"
                  >
                    <TableCell className="font-heading">
                      <div className="flex items-center gap-2">
                        {getTrophyIcon(index + 1)}
                        {index + 1}
                      </div>
                    </TableCell>
                    <TableCell className="font-sans text-white">
                      <QuickProfile userId={player.uid} username={player.name}>
                        <div className="flex items-center gap-2 cursor-pointer min-w-0">
                          {/*Removed Tier Icon*/}
                          <span className="truncate">{player.name}</span>
                        </div>
                      </QuickProfile>
                    </TableCell>
                    <TableCell className="text-right font-sans">
                      <motion.span
                        animate={{
                          scale: [1, 1.1, 1],
                          backgroundColor: [
                            "transparent",
                            "#008000",
                            "transparent",
                          ],
                        }}
                        transition={{ duration: 5, repeat: 1, repeatDelay: 0 }}
                      >
                        ${getWagerAmount(player)?.toLocaleString()}
                      </motion.span>
                    </TableCell>
                    <TableCell className={`text-right font-sans text-[#D7FF00] ${showCompletedRace ? 'font-bold' : ''}`}>
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