import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WagerTotals {
  dailyTotal: number;
  weeklyTotal: number;
  monthlyTotal: number;
  allTimeTotal: number;
}

interface DashboardStats {
  totalUsers: number;
  activeRaces: number;
  wagerTotals: WagerTotals;
}

export default function AnalyticsDashboard() {
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/stats"],
  });

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Users</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {stats?.totalUsers || 0}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Races</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {stats?.activeRaces || 0}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Daily Total</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-[#D7FF00]">
            ${stats?.wagerTotals?.dailyTotal?.toLocaleString() || "0"}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Total</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-[#D7FF00]">
            ${stats?.wagerTotals?.weeklyTotal?.toLocaleString() || "0"}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Total</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-[#D7FF00]">
            ${stats?.wagerTotals?.monthlyTotal?.toLocaleString() || "0"}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All-Time Total</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-[#D7FF00]">
            ${stats?.wagerTotals?.allTimeTotal?.toLocaleString() || "0"}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
