interface PlayerData {
  uid: string;
  wagered: {
    today?: number;
    this_week?: number;
    this_month?: number;
    all_time?: number;
  };
}

interface LeaderboardData {
  today: { data: PlayerData[] };
  weekly: { data: PlayerData[] };
  monthly: { data: PlayerData[] };
  all_time: { data: PlayerData[] };
}

// In your useQuery, annotate the type:
const { data: leaderboardData, isLoading } = useQuery<LeaderboardData>({
  queryKey: ["/api/affiliate/stats"],
  staleTime: 30000,
  retry: 3,
  refetchOnWindowFocus: false,
  initialData: {
    data: {
      today: { data: [] },
      weekly: { data: [] },
      monthly: { data: [] },
      all_time: { data: [] },
    },
  },
});

// Then, in your stats computation, use the PlayerData type:
const stats = useMemo(() => {
  if (!leaderboardData?.data) return null;

  const userStats = {
    today:
      leaderboardData.data.today.data.find((p: PlayerData) => p.uid === userId)
        ?.wagered?.today || 0,
    this_week:
      leaderboardData.data.weekly.data.find((p: PlayerData) => p.uid === userId)
        ?.wagered?.this_week || 0,
    this_month:
      leaderboardData.data.monthly.data.find((p: PlayerData) => p.uid === userId)
        ?.wagered?.this_month || 0,
    all_time:
      leaderboardData.data.all_time.data.find((p: PlayerData) => p.uid === userId)
        ?.wagered?.all_time || 0,
  };

  const position = {
    weekly:
      (leaderboardData.data.weekly.data.findIndex((p: PlayerData) => p.uid === userId) + 1) || undefined,
    monthly:
      (leaderboardData.data.monthly.data.findIndex((p: PlayerData) => p.uid === userId) + 1) || undefined,
  };

  return {
    wagered: userStats,
    position,
  };
}, [leaderboardData, userId]);
