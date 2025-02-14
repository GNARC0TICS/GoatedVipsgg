import React from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Calendar, Clock, Crown } from "lucide-react";
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
  position?: {
    daily?: number;
    weekly?: number;
    monthly?: number;
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
    retry: 3,
    refetchOnWindowFocus: false,
    initialData: {
      data: {
        today: { data: [] },
        weekly: { data: [] },
        monthly: { data: [] },
        all_time: { data: [] }
      }
    }
  });

  const stats = React.useMemo(() => {
    if (!leaderboardData?.data) return null;

    const userStats = {
      today:
        leaderboardData.data.today.data.find((p) => p.uid === userId)?.wagered
          ?.today || 0,
      this_week:
        leaderboardData.data.weekly.data.find((p) => p.uid === userId)?.wagered
          ?.this_week || 0,
      this_month:
        leaderboardData.data.monthly.data.find((p) => p.uid === userId)?.wagered
          ?.this_month || 0,
      all_time:
        leaderboardData.data.all_time.data.find((p) => p.uid === userId)
          ?.wagered?.all_time || 0,
    };

    const position = {
      weekly: leaderboardData.data.weekly.data.findIndex((p) => p.uid === userId) + 1 || undefined,
      monthly: leaderboardData.data.monthly.data.findIndex((p) => p.uid === userId) + 1 || undefined
    };

    return { 
      wagered: userStats,
      position
    };
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
              <div className={`h-16 w-16 rounded-full bg-[#2A2B31] flex items-center justify-center ${stats?.position?.monthly === 1 ? 'ring-4 ring-[#D7FF00] animate-pulse' : ''}`}>
                <img
                  src={getTierIcon(
                    getTierFromWager(stats?.wagered?.all_time || 0),
                  )}
                  alt="Tier"
                  className="h-12 w-12"
                />
              </div>
              <div>
                <h2 className={`text-2xl font-heading ${stats?.position?.monthly === 1 ? 'text-[#D7FF00]' : 'text-white'}`}>
                  {username}
                  {stats?.position?.monthly === 1 && 
                    <span className="ml-2 inline-flex items-center">
                      <Crown className="h-5 w-5 text-[#D7FF00] animate-bounce" />
                    </span>
                  }
                </h2>
                <p className="text-[#8A8B91]">Profile Stats</p>
                {stats?.position && (
                  <div className="flex gap-2 mt-1">
                    {stats.position.monthly && (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        stats.position.monthly === 1 ? 'bg-[#D7FF00] text-black font-bold' : 'bg-[#2A2B31] text-white'
                      }`}>
                        #{stats.position.monthly} Monthly
                      </span>
                    )}
                    {stats.position.weekly && (
                      <span className="text-xs px-2 py-0.5 rounded bg-[#2A2B31] text-white">
                        #{stats.position.weekly} Weekly
                      </span>
                    )}
                  </div>
                )}
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
                    ${stats?.wagered?.today.toLocaleString() || "0"}
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
                    ${stats?.wagered?.this_week.toLocaleString() || "0"}
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
                    ${stats?.wagered?.this_month.toLocaleString() || "0"}
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
                    ${stats?.wagered?.all_time.toLocaleString() || "0"}
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