import React from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Calendar, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { getTierFromWager, getTierIcon } from "@/lib/tier-utils";
import { useQuery } from "@tanstack/react-query";
import { LoadingSpinner } from "./LoadingSpinner";

interface QuickProfileProps {
  userId: string;
  username: string;
  children: React.ReactNode;
}

interface UserStats {
  wagered: {
    today: number;
    this_week: number;
    this_month: number;
    all_time: number;
  };
}

export function QuickProfile({
  userId,
  username,
  children,
}: QuickProfileProps) {
  const { data: leaderboardData, isLoading } = useQuery({
    queryKey: ["/api/affiliate/stats"],
    staleTime: 30000,
  });

  const stats = React.useMemo(() => {
    if (!leaderboardData?.data) return null;

    const userStats = {
      today:
        leaderboardData.data.today.data.find((p) => p.uid === userId)?.wagered
          .today || 0,
      this_week:
        leaderboardData.data.weekly.data.find((p) => p.uid === userId)?.wagered
          .this_week || 0,
      this_month:
        leaderboardData.data.monthly.data.find((p) => p.uid === userId)?.wagered
          .this_month || 0,
      all_time:
        leaderboardData.data.all_time.data.find((p) => p.uid === userId)
          ?.wagered.all_time || 0,
    };

    return { wagered: userStats };
  }, [leaderboardData, userId]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <span className="cursor-pointer hover:text-[#D7FF00] transition-colors">
          {children}
        </span>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="fixed inset-y-0 right-0 w-[90vw] md:w-[400px] bg-[#1A1B21]/95 backdrop-blur-lg border-[#2A2B31] overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 pt-6"
          >
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-[#2A2B31] flex items-center justify-center">
                <img
                  src={getTierIcon(
                    getTierFromWager(stats?.wagered.all_time || 0),
                  )}
                  alt="Tier"
                  className="h-12 w-12"
                />
              </div>
              <div>
                <h2 className="text-2xl font-heading text-white">{username}</h2>
                <p className="text-[#8A8B91]">Profile Stats</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <Card className="bg-[#1A1B21] border-[#2A2B31]">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-[#D7FF00]" />
                    <span className="text-[#8A8B91] text-sm">Today</span>
                  </div>
                  <p className="text-xl font-bold text-white">
                    ${stats?.wagered.today.toLocaleString() || "0"}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#1A1B21] border-[#2A2B31]">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-[#D7FF00]" />
                    <span className="text-[#8A8B91] text-sm">Weekly</span>
                  </div>
                  <p className="text-xl font-bold text-white">
                    ${stats?.wagered.this_week.toLocaleString() || "0"}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#1A1B21] border-[#2A2B31]">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-[#D7FF00]" />
                    <span className="text-[#8A8B91] text-sm">Monthly</span>
                  </div>
                  <p className="text-xl font-bold text-white">
                    ${stats?.wagered.this_month.toLocaleString() || "0"}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#1A1B21] border-[#2A2B31]">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-[#D7FF00]" />
                    <span className="text-[#8A8B91] text-sm">All Time</span>
                  </div>
                  <p className="text-xl font-bold text-white">
                    ${stats?.wagered.all_time.toLocaleString() || "0"}
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </SheetContent>
    </Sheet>
  );
}
