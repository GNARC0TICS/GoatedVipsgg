import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/PageTransition";
import { 
  Users, 
  Gift, 
  Trophy, 
  BarChart3, 
  ArrowUpRight,
  ArrowDownRight,
  Users2
} from "lucide-react";

interface AdminAnalytics {
  totalUsers: number;
  activeRaces: number;
  wagerTotals: {
    dailyTotal: number;
    weeklyTotal: number;
    monthlyTotal: number;
    allTimeTotal: number;
  };
}

export default function AdminDashboard() {
  const { data: analytics, isLoading } = useQuery<AdminAnalytics>({
    queryKey: ["adminAnalytics"],
    queryFn: async () => {
      const response = await fetch("/api/admin/analytics", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }
      return response.json();
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D7FF00]"></div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <div className="flex gap-4">
            <Button
              variant="outline"
              className="border-[#2A2B31] bg-[#1A1B21] hover:bg-[#24252C]"
              asChild
            >
              <Link href="/admin/users">
                <Users className="w-4 h-4 mr-2" />
                Manage Users
              </Link>
            </Button>
            <Button
              variant="outline"
              className="border-[#2A2B31] bg-[#1A1B21] hover:bg-[#24252C]"
              asChild
            >
              <Link href="/admin/bonus-codes">
                <Gift className="w-4 h-4 mr-2" />
                Bonus Codes
              </Link>
            </Button>
            <Button
              variant="outline"
              className="border-[#2A2B31] bg-[#1A1B21] hover:bg-[#24252C]"
              asChild
            >
              <Link href="/admin/wager-races">
                <Trophy className="w-4 h-4 mr-2" />
                Wager Races
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-[#2A2B31] bg-[#1A1B21]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users2 className="h-4 w-4 text-[#D7FF00]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.totalUsers || 0}</div>
            </CardContent>
          </Card>

          <Card className="border-[#2A2B31] bg-[#1A1B21]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Races</CardTitle>
              <Trophy className="h-4 w-4 text-[#D7FF00]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.activeRaces || 0}</div>
            </CardContent>
          </Card>

          <Card className="border-[#2A2B31] bg-[#1A1B21]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Daily Wager Total</CardTitle>
              <BarChart3 className="h-4 w-4 text-[#D7FF00]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${analytics?.wagerTotals.dailyTotal?.toLocaleString() || "0"}
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#2A2B31] bg-[#1A1B21]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Monthly Wager Total</CardTitle>
              <BarChart3 className="h-4 w-4 text-[#D7FF00]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${analytics?.wagerTotals.monthlyTotal?.toLocaleString() || "0"}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-[#2A2B31] bg-[#1A1B21]">
            <CardHeader>
              <CardTitle>Wager Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium">Weekly Total</p>
                    <h3 className="text-2xl font-bold">
                      ${analytics?.wagerTotals.weeklyTotal?.toLocaleString() || "0"}
                    </h3>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium">All Time Total</p>
                    <h3 className="text-2xl font-bold">
                      ${analytics?.wagerTotals.allTimeTotal?.toLocaleString() || "0"}
                    </h3>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#2A2B31] bg-[#1A1B21]">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="border-[#2A2B31] bg-[#1A1B21] hover:bg-[#24252C]"
                  asChild
                >
                  <Link href="/admin/support">
                    <Users className="w-4 h-4 mr-2" />
                    Support Tickets
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="border-[#2A2B31] bg-[#1A1B21] hover:bg-[#24252C]"
                  asChild
                >
                  <Link href="/admin/settings">
                    <Users className="w-4 h-4 mr-2" />
                    Platform Settings
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}