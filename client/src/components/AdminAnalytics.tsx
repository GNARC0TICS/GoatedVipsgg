
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";

export function AdminAnalytics() {
  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
      <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-muted-foreground">Total Users</span>
          </div>
          <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
          <span className="text-xs text-muted-foreground">
            {stats?.newUsers || 0} new this week
          </span>
        </CardContent>
      </Card>

      <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-muted-foreground">Active Races</span>
          </div>
          <p className="text-2xl font-bold">{stats?.activeRaces || 0}</p>
          <span className="text-xs text-muted-foreground">
            {stats?.completedRaces || 0} completed
          </span>
        </CardContent>
      </Card>

      <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-muted-foreground">Total Prize Pool</span>
          </div>
          <p className="text-2xl font-bold">
            ${stats?.totalPrizePool?.toLocaleString() || 0}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-muted-foreground">Race Participants</span>
          </div>
          <p className="text-2xl font-bold">{stats?.totalParticipants || 0}</p>
          <span className="text-xs text-muted-foreground">
            {stats?.activeParticipants || 0} currently active
          </span>
        </CardContent>
      </Card>

      {stats?.wagerTrend && (
        <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31] col-span-full">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4">Wager Trend</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.wagerTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#D7FF00"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
