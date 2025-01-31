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
  Star,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserSettings } from "@/components/UserSettings";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { getTierFromWager, getTierIcon } from "@/lib/tier-utils";

export default function UserProfile() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/profile"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/affiliate/stats"],
  });

  if (isLoading) return <LoadingSpinner />;
  if (!user || !stats) return null;

  // Find user's stats in leaderboard data
  const userStats = stats.data.all_time.data.find(
    (p) => p.name === user.username
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
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
              onClick={() => setLocation("/wager-races")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </motion.div>

          {/* User Info */}
          <motion.div variants={itemVariants}>
            <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-[#2A2B31] flex items-center justify-center">
                      <img
                        src={getTierIcon(getTierFromWager(userStats?.wagered?.all_time || 0))}
                        alt="Tier"
                        className="w-16 h-16"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h1 className="text-2xl md:text-3xl font-heading font-bold text-[#D7FF00] mb-2">
                      {user.username}
                    </h1>
                    <div className="flex flex-wrap gap-4 text-sm text-[#8A8B91]">
                      <div className="flex items-center gap-2">
                        <LineChart className="h-4 w-4 text-[#D7FF00]" />
                        Total Wagered: ${userStats?.wagered?.all_time?.toLocaleString() || "0"}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Settings Tabs */}
          <motion.div variants={itemVariants}>
            <UserSettings />
          </motion.div>
          {/* Stats Grid -  Removed as per edited code */}
          {/* Achievements - Removed as per edited code */}
          {/* History Table - Removed as per edited code */}

        </motion.div>
      </div>
    </div>
  );
}