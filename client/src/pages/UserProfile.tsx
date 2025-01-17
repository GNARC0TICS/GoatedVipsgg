import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Trophy,
  User,
  LineChart,
  Award,
  Clock,
  ArrowLeft,
  TrendingUp,
  Medal,
  Star
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface UserStats {
  username: string;
  totalWagered: number;
  currentRank: number;
  bestRank: number;
  races: {
    participated: number;
    won: number;
    totalPrizes: number;
  };
  achievements: Array<{
    name: string;
    description: string;
    earned: string;
  }>;
  history: Array<{
    period: string;
    wagered: number;
    rank: number;
    prize: number;
  }>;
}

export default function UserProfile({ userId }: { userId: string }) {
  const [, setLocation] = useLocation();

  const { data: user, isLoading } = useQuery<UserStats>({
    queryKey: [`/api/users/${userId}`],
  });

  if (isLoading) return <LoadingSpinner />;
  if (!user) return null;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-[#14151A] text-white">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex items-center justify-between">
            <Button
              variant="ghost"
              className="gap-2"
              onClick={() => setLocation('/wager-races')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Races
            </Button>
          </motion.div>

          {/* User Info */}
          <motion.div variants={itemVariants}>
            <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-[#2A2B31] flex items-center justify-center">
                      <User className="h-12 w-12 text-[#D7FF00]" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-[#D7FF00] text-black font-bold px-2 py-1 rounded-full text-sm">
                      #{user.currentRank}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h1 className="text-2xl md:text-3xl font-heading font-bold text-[#D7FF00] mb-2">
                      {user.username}
                    </h1>
                    <div className="flex flex-wrap gap-4 text-sm text-[#8A8B91]">
                      <div className="flex items-center gap-2">
                        <LineChart className="h-4 w-4 text-[#D7FF00]" />
                        Total Wagered: ${user.totalWagered.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-[#D7FF00]" />
                        Best Rank: #{user.bestRank}
                      </div>
                      <div className="flex items-center gap-2">
                        <Medal className="h-4 w-4 text-[#D7FF00]" />
                        Races Won: {user.races.won}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-5 w-5 text-[#D7FF00]" />
                  <span className="text-sm text-[#8A8B91]">Total Prizes</span>
                </div>
                <p className="text-2xl font-bold">${user.races.totalPrizes.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-5 w-5 text-[#D7FF00]" />
                  <span className="text-sm text-[#8A8B91]">Races Participated</span>
                </div>
                <p className="text-2xl font-bold">{user.races.participated}</p>
              </CardContent>
            </Card>

            <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-5 w-5 text-[#D7FF00]" />
                  <span className="text-sm text-[#8A8B91]">Win Rate</span>
                </div>
                <p className="text-2xl font-bold">
                  {((user.races.won / user.races.participated) * 100).toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Achievements */}
          <motion.div variants={itemVariants}>
            <h2 className="text-xl font-heading font-bold text-white mb-4">Achievements</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {user.achievements.map((achievement) => (
                <Card 
                  key={achievement.name}
                  className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        <Award className="h-6 w-6 text-[#D7FF00]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white mb-1">{achievement.name}</h3>
                        <p className="text-sm text-[#8A8B91] mb-2">{achievement.description}</p>
                        <div className="flex items-center gap-2 text-xs text-[#8A8B91]">
                          <Clock className="h-3 w-3" />
                          Earned: {achievement.earned}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* History Table */}
          <motion.div variants={itemVariants}>
            <h2 className="text-xl font-heading font-bold text-white mb-4">Race History</h2>
            <div className="bg-[#1A1B21]/50 backdrop-blur-sm rounded-xl border border-[#2A2B31] overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-heading text-[#D7FF00]">PERIOD</TableHead>
                      <TableHead className="text-right font-heading text-[#D7FF00]">WAGERED</TableHead>
                      <TableHead className="text-right font-heading text-[#D7FF00]">RANK</TableHead>
                      <TableHead className="text-right font-heading text-[#D7FF00]">PRIZE</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {user.history.map((record) => (
                      <TableRow key={record.period}>
                        <TableCell className="font-medium">{record.period}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            ${record.wagered.toLocaleString()}
                            {record.wagered > 0 && (
                              <TrendingUp className="h-4 w-4 text-green-400" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">#{record.rank}</TableCell>
                        <TableCell className="text-right text-[#D7FF00]">
                          ${record.prize.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}