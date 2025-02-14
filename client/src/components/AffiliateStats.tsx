import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useAffiliateStats } from "@/hooks/useApi";
import { Skeleton } from "@/components/ui/skeleton";

export function AffiliateStats() {
  const { data, isLoading, error } = useAffiliateStats();

  console.log('Affiliate Stats Data:', data);
  console.log('Loading State:', isLoading);
  if (error) console.error('Affiliate Stats Error:', error);

  if (error) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full">
          <CardContent className="p-6">
            <p className="text-destructive">Failed to load affiliate statistics</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[200px]" />
        ))}
      </div>
    );
  }

  // Extract stats from the data
  const stats = {
    daily: data.data.today.data.reduce((sum, user) => sum + (user.wagered || 0), 0),
    weekly: data.data.weekly.data.reduce((sum, user) => sum + (user.wagered || 0), 0),
    monthly: data.data.monthly.data.reduce((sum, user) => sum + (user.wagered || 0), 0),
  };

  // Create chart data
  const chartData = [
    { name: "Today", value: stats.daily },
    { name: "This Week", value: stats.weekly },
    { name: "This Month", value: stats.monthly },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Daily Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={[{ name: "Today", value: stats.daily }]}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#D7FF00" 
                strokeWidth={2}
                dot={{ fill: "#D7FF00" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={[{ name: "This Week", value: stats.weekly }]}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#D7FF00" 
                strokeWidth={2}
                dot={{ fill: "#D7FF00" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={[{ name: "This Month", value: stats.monthly }]}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#D7FF00" 
                strokeWidth={2}
                dot={{ fill: "#D7FF00" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}