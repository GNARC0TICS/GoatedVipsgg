import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { AFFILIATE_STATS_KEY } from "@/hooks/use-leaderboard.ts";
import { useEffect, useState, useMemo } from "react";
import {
  Users,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatNumber } from "@/lib/utils";
import { useLoading } from "@/contexts/LoadingContext";

// Type for the API response
interface AffiliateResponse {
  status: string;
  metadata: {
    totalUsers: number;
    lastUpdated: string;
  };
  data: {
    today: { data: LeaderboardEntry[] };
    weekly: { data: LeaderboardEntry[] };
    monthly: { data: LeaderboardEntry[] };
    all_time: { data: LeaderboardEntry[] };
  };
}

// Type for individual leaderboard entries
interface LeaderboardEntry {
  uid: string;
  name: string;
  wagered: {
    today: number;
    this_week: number;
    this_month: number;
    all_time: number;
  };
}

// Type for derived affiliate data points
interface AffiliateDataPoint {
  timestamp: string;
  referredUsers: number;
  totalWagers: number;
  commission: number;
}

// Type for the stat cards
interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  positive?: boolean;
  icon: React.ReactNode;
  loading?: boolean;
}

// Helper function to format date
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Component for stat cards
function StatCard({ title, value, change, positive, icon, loading }: StatCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-6 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
            {change && (
              <p className={`text-xs mt-1 flex items-center ${positive ? 'text-green-500' : 'text-red-500'}`}>
                {positive ? '↑' : '↓'} {change}
              </p>
            )}
          </div>
          <div className="p-3 bg-[#2A2B31] rounded-full">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main component
export function AffiliateStats() {
  const loadingKey = "affiliate-stats";
  const { startLoadingFor, stopLoadingFor, isLoadingFor } = useLoading();
  const [error, setError] = useState<string | null>(null);

  // Query for affiliate data
  const { data, isLoading, refetch } = useQuery<AffiliateResponse>({
    queryKey: [AFFILIATE_STATS_KEY],
    staleTime: 60000, // 1 minute
    onSuccess: (data) => {
      // Success handler
      console.log("Affiliate stats loaded successfully");
    },
    onError: (err: Error) => {
      console.error("Error fetching affiliate stats:", err);
      setError(err instanceof Error ? err.message : "Failed to load affiliate statistics");
    },
  });

  useEffect(() => {
    // Start loading when component mounts
    if (!isLoadingFor(loadingKey)) {
      startLoadingFor(loadingKey);
    }
    
    // Stop loading when data is available or on error
    if ((!isLoading && data) || error) {
      if (isLoadingFor(loadingKey)) {
        stopLoadingFor(loadingKey);
      }
    }
    
    return () => {
      // Clean up loading state
      if (isLoadingFor(loadingKey)) {
        stopLoadingFor(loadingKey);
      }
    };
  }, [data, isLoading, error, loadingKey, startLoadingFor, stopLoadingFor, isLoadingFor]);

  // Calculate summary statistics from the raw API data
  const stats = useMemo(() => {
    if (!data) return null;
    
    // Process the data for chart visualization
    const totalUsers = data.metadata.totalUsers || 0;
    
    // Calculate total wagers across periods
    const totalWagersDaily = data.data.today.data.reduce((sum: number, entry: LeaderboardEntry) => 
      sum + (entry.wagered.today || 0), 0);
    
    const totalWagersWeekly = data.data.weekly.data.reduce((sum: number, entry: LeaderboardEntry) => 
      sum + (entry.wagered.this_week || 0), 0);
    
    const totalWagersMonthly = data.data.monthly.data.reduce((sum: number, entry: LeaderboardEntry) => 
      sum + (entry.wagered.this_month || 0), 0);
    
    const totalWagersAllTime = data.data.all_time.data.reduce((sum: number, entry: LeaderboardEntry) => 
      sum + (entry.wagered.all_time || 0), 0);
    
    // Calculate average wager per user
    const avgWager = totalUsers > 0 ? totalWagersAllTime / totalUsers : 0;
    
    // Calculate commission (assuming 1% commission rate)
    const commissionRate = 0.01; // 1% commission
    const totalCommission = totalWagersAllTime * commissionRate;
    
    return {
      totalUsers,
      totalWagersDaily,
      totalWagersWeekly,
      totalWagersMonthly,
      totalWagersAllTime,
      avgWager,
      totalCommission,
      lastUpdated: data.metadata.lastUpdated
    };
  }, [data]);
  
  // Create derived time-series data for charts
  const chartData = useMemo(() => {
    // Generate synthetic time series data based on current values
    // This is a placeholder until we have actual historical data
    if (!stats) return [];
    
    const now = new Date();
    const dataPoints: AffiliateDataPoint[] = [];
    
    // Derive daily points for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      const dailyFactor = Math.max(0.85, Math.min(1.15, 0.9 + Math.random() * 0.3));
      
      dataPoints.push({
        timestamp: date.toISOString().split('T')[0],
        referredUsers: Math.floor(stats.totalUsers / 7 * dailyFactor),
        totalWagers: stats.totalWagersDaily / 7 * dailyFactor,
        commission: (stats.totalWagersDaily / 7 * dailyFactor) * 0.01
      });
    }
    
    return dataPoints;
  }, [stats]);

  // Handle loading state
  if (isLoading || isLoadingFor(loadingKey)) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px]" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-[300px]" />
          ))}
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="rounded-lg border border-red-400 bg-red-100/10 p-8 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-red-400 mb-2" />
        <h3 className="text-xl font-semibold mb-2">Failed to Load Affiliate Stats</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button 
          variant="outline"
          onClick={() => {
            setError(null);
            refetch();
          }}
          className="mx-auto"
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  // Handle no data state
  if (!stats) {
    return (
      <div className="rounded-lg border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm p-8 text-center">
        <div className="text-xl font-semibold mb-2">No Affiliate Data Available</div>
        <p className="text-muted-foreground max-w-md mx-auto mb-4">
          There are no affiliate statistics available at this time. Please try again later.
        </p>
        <Button 
          variant="outline" 
          onClick={() => refetch()}
          className="mx-auto"
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh Data
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={formatNumber(stats.totalUsers)}
          icon={<Users className="h-5 w-5 text-[#D7FF00]" />}
        />
        <StatCard
          title="Total Wagers (All Time)"
          value={`$${formatNumber(stats.totalWagersAllTime)}`}
          icon={<TrendingUp className="h-5 w-5 text-[#D7FF00]" />}
        />
        <StatCard
          title="Average Wager Per User"
          value={`$${formatNumber(stats.avgWager)}`}
          icon={<Users className="h-5 w-5 text-[#D7FF00]" />}
        />
        <StatCard
          title="Commission Earned"
          value={`$${formatNumber(stats.totalCommission)}`}
          icon={<DollarSign className="h-5 w-5 text-[#D7FF00]" />}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily Wagering Trend</CardTitle>
            <CardDescription>
              Last updated: {formatDate(stats.lastUpdated)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis
                  tickFormatter={(value) => `$${formatNumber(value)}`}
                />
                <Tooltip
                  formatter={(value) => [`$${formatNumber(Number(value))}`, 'Total Wagers']}
                  labelFormatter={(label) => formatDate(String(label))}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="totalWagers" 
                  name="Total Wagers" 
                  stroke="#D7FF00" 
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#D7FF00" }}
                  activeDot={{ r: 6, fill: "#D7FF00" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Earnings Breakdown</CardTitle>
            <CardDescription>
              Commission rates applied to different time periods
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={[
                { name: 'Daily', value: stats.totalWagersDaily * 0.01 },
                { name: 'Weekly', value: stats.totalWagersWeekly * 0.01 },
                { name: 'Monthly', value: stats.totalWagersMonthly * 0.01 },
                { name: 'All Time', value: stats.totalCommission }
              ]}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `$${formatNumber(value)}`} />
                <Tooltip formatter={(value) => [`$${formatNumber(Number(value))}`, 'Commission']} />
                <Bar dataKey="value" name="Commission" fill="#D7FF00" radius={[4, 4, 0, 0]} />
                <ReferenceLine y={0} stroke="#666" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Last updated timestamp */}
      <div className="text-xs text-muted-foreground text-right">
        Last updated: {new Date(stats.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
}
