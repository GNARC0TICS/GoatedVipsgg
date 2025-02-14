import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

interface Stats {
  totalUsers: number;
  activeRaces: number;
  wagerTotals: {
    dailyTotal: number;
    weeklyTotal: number;
    monthlyTotal: number;
    allTimeTotal: number;
  };
}

export default function AnalyticsDashboard() {
  const { data: stats } = useQuery<{ success: boolean; data: Stats }>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const response = await fetch('/api/admin/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Users</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {stats?.data?.totalUsers || 0}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Races</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {stats?.data?.activeRaces || 0}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Daily Total</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-[#D7FF00]">
            ${stats?.data?.wagerTotals?.dailyTotal?.toLocaleString() || '0'}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Total</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-[#D7FF00]">
            ${stats?.data?.wagerTotals?.weeklyTotal?.toLocaleString() || '0'}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Total</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-[#D7FF00]">
            ${stats?.data?.wagerTotals?.monthlyTotal?.toLocaleString() || '0'}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All-Time Total</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-[#D7FF00]">
            ${stats?.data?.wagerTotals?.allTimeTotal?.toLocaleString() || '0'}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}