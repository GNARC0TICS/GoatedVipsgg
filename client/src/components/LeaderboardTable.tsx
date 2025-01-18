import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User, Trophy, ChevronLeft, ChevronRight, Clock, Calendar, CalendarDays, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

type WageredData = {
  today: number;
  this_week: number;
  this_month: number;
  all_time: number;
};

type LeaderboardEntry = {
  uid: string;
  name: string;
  wagered: WageredData;
};

type LeaderboardData = {
  success: boolean;
  metadata?: {
    totalUsers: number;
    lastUpdated: string;
  };
  data: {
    today: { data: LeaderboardEntry[] };
    all_time: { data: LeaderboardEntry[] };
    monthly: { data: LeaderboardEntry[] };
    weekly: { data: LeaderboardEntry[] };
  };
};

const ITEMS_PER_PAGE = 10;
const POLLING_INTERVAL = 10000; // 10 seconds
const MAX_WEBSOCKET_RECONNECT_ATTEMPTS = 3;

export function LeaderboardTable() {
  const [timePeriod, setTimePeriod] = useState<'today' | 'all_time' | 'monthly' | 'weekly'>('today');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(null);
  const [usePolling, setUsePolling] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/affiliate/stats?page=${currentPage}&limit=${ITEMS_PER_PAGE}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.data) {
        setLeaderboardData(data);
        setError(null);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError("Failed to fetch leaderboard data");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch leaderboard data. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, toast]);

  useEffect(() => {
    let isSubscribed = true;
    let ws: WebSocket | null = null;
    let reconnectAttempts = 0;
    let pollInterval: NodeJS.Timeout | null = null;

    const setupPolling = () => {
      if (!usePolling) return;

      // Initial fetch
      fetchData();

      // Setup polling interval
      pollInterval = setInterval(fetchData, POLLING_INTERVAL);
    };

    const connectWebSocket = () => {
      if (usePolling || reconnectAttempts >= MAX_WEBSOCKET_RECONNECT_ATTEMPTS) {
        if (!usePolling) {
          setUsePolling(true);
          toast({
            title: "Switching to polling",
            description: "Real-time updates unavailable. Switching to regular updates.",
          });
        }
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/affiliate-stats`;

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttempts = 0;
        if (usePolling) {
          setUsePolling(false);
          toast({
            title: "Connected",
            description: "Real-time updates restored.",
          });
        }
      };

      ws.onmessage = (event) => {
        if (!isSubscribed) return;

        try {
          const response = JSON.parse(event.data);
          if (response.success && response.data) {
            setLeaderboardData(response);
            setIsLoading(false);
            setError(null);
          }
        } catch (error) {
          console.error('Error parsing WebSocket data:', error);
          setError("Error processing real-time data");
        }
      };

      ws.onerror = () => {
        console.error('WebSocket error occurred');
        reconnectAttempts++;
        if (reconnectAttempts >= MAX_WEBSOCKET_RECONNECT_ATTEMPTS) {
          setUsePolling(true);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket closed, attempting to reconnect...');
        setTimeout(connectWebSocket, Math.min(1000 * reconnectAttempts, 5000));
      };
    };

    // Start with WebSocket connection
    if (!usePolling) {
      connectWebSocket();
    } else {
      setupPolling();
    }

    // Cleanup function
    return () => {
      isSubscribed = false;
      if (ws) {
        ws.close();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [usePolling, fetchData, toast]);

  const renderTimePeriodIcon = (period: typeof timePeriod) => {
    switch (period) {
      case 'today':
        return <Clock className="h-4 w-4" />;
      case 'weekly':
        return <Calendar className="h-4 w-4" />;
      case 'monthly':
        return <CalendarDays className="h-4 w-4" />;
      case 'all_time':
        return <Trophy className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 justify-center">
          {['today', 'all_time', 'monthly', 'weekly'].map((period) => (
            <Skeleton key={period} className="h-10 w-24" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center space-y-4">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
        <div className="text-destructive font-medium">{error}</div>
        <Button onClick={() => fetchData()} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  if (!leaderboardData?.data?.[timePeriod]?.data) {
    return <div className="text-center text-muted-foreground">No leaderboard data available</div>;
  }

  const currentData = leaderboardData.data[timePeriod].data;
  const totalPages = Math.ceil(currentData.length / ITEMS_PER_PAGE);
  const displayData = currentData.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 justify-center flex-wrap">
          {[
            { id: 'today', label: 'TODAY' },
            { id: 'all_time', label: 'ALL TIME' },
            { id: 'monthly', label: 'MONTHLY' },
            { id: 'weekly', label: 'WEEKLY' }
          ].map(({ id, label }) => (
            <Button
              key={id}
              variant={timePeriod === id ? 'default' : 'outline'}
              onClick={() => setTimePeriod(id as typeof timePeriod)}
              className={`font-heading tracking-tight flex items-center gap-2 ${
                  timePeriod === id ? 'bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90' : 'border-[#2A2B31] hover:border-[#D7FF00]/50'
                }`}
            >
              {renderTimePeriodIcon(id as typeof timePeriod)}
              {label}
            </Button>
          ))}
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Total Users: {leaderboardData.metadata?.totalUsers.toLocaleString()} | 
          Last Updated: {new Date(leaderboardData.metadata?.lastUpdated || Date.now()).toLocaleTimeString()}
        </div>
        <Button onClick={() => fetchData()}>Refresh</Button> {/* Added refresh button */}
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 md:w-20 font-heading text-primary text-sm md:text-base">RANK</TableHead>
              <TableHead className="font-heading text-primary text-sm md:text-base">USERNAME</TableHead>
              <TableHead className="text-right font-heading text-primary text-sm md:text-base">WAGER</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="wait">
              {displayData.map((entry, index) => (
                <motion.tr
                  key={entry.uid}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedUser(entry)}
                >
                  <TableCell className="font-heading text-foreground py-4 md:py-4 text-sm md:text-base">
                    <div className="flex items-center gap-1">
                      {index + 1 + currentPage * ITEMS_PER_PAGE <= 3 && (
                        <Trophy className="h-4 w-4 text-primary" />
                      )}
                      {index + 1 + currentPage * ITEMS_PER_PAGE}
                    </div>
                  </TableCell>
                  <TableCell className="font-sans text-foreground py-4 md:py-4 text-sm md:text-base">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary hidden md:block" />
                      <span className="truncate max-w-[120px] md:max-w-none group-hover:text-primary transition-colors">
                        {entry.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-sans text-foreground py-4 md:py-4 text-sm md:text-base">
                    ${entry.wagered[timePeriod === 'weekly' ? 'this_week' : 
                              timePeriod === 'monthly' ? 'this_month' : 
                              timePeriod === 'today' ? 'today' :
                              'all_time'].toLocaleString()}
                  </TableCell>
                </motion.tr>
              ))}
            </AnimatePresence>
          </TableBody>
        </Table>

        <div className="flex items-center justify-between px-4 py-4 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {currentPage * ITEMS_PER_PAGE + 1} to {Math.min((currentPage + 1) * ITEMS_PER_PAGE, currentData.length)} of {currentData.length}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {selectedUser?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Wager Statistics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Today</div>
                    <div className="text-2xl">${selectedUser.wagered.today.toLocaleString()}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">This Week</div>
                    <div className="text-2xl">${selectedUser.wagered.this_week.toLocaleString()}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">This Month</div>
                    <div className="text-2xl">${selectedUser.wagered.this_month.toLocaleString()}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">All Time</div>
                    <div className="text-2xl">${selectedUser.wagered.all_time.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}