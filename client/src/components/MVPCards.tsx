import { Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistance } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";

type MVP = {
  username: string;
  wagerAmount: number;
  avatarUrl?: string;
  rank: number;
  lastActive: string;
};

const timeframes = [
  { title: "Daily MVP", period: "daily", gradient: "from-[#FFD700]/20" },
  { title: "Weekly MVP", period: "weekly", gradient: "from-[#C0C0C0]/20" },
  { title: "Monthly MVP", period: "monthly", gradient: "from-[#CD7F32]/20" }
];

export function MVPCards() {
  const { data: mvps, isLoading } = useQuery<Record<string, MVP>>({
    queryKey: ["/api/mvp-stats"],
  });

  if (isLoading || !mvps) {
    return (
      <div className="grid md:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {timeframes.map((timeframe) => (
          <Card key={timeframe.period} className="p-8 bg-[#1A1B21]/50 animate-pulse">
            <div className="h-48"></div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-6 max-w-7xl mx-auto">
      {timeframes.map((timeframe) => (
        <motion.div
          key={timeframe.period}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative group transform transition-all duration-300 hover:scale-[1.02]"
        >
          <div className={`absolute inset-0 bg-gradient-to-b ${timeframe.gradient} to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur-sm`} />
          <div className="relative p-8 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm hover:border-[#D7FF00]/50 transition-all duration-300 shadow-lg hover:shadow-[#FFD700]/20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-[#D7FF00]" />
                <h3 className="text-xl font-heading text-white">{timeframe.title}</h3>
              </div>
            </div>
            
            {mvps[timeframe.period] ? (
              <div>
                <div className="flex items-center gap-4 mb-4">
                  {mvps[timeframe.period].avatarUrl ? (
                    <img 
                      src={mvps[timeframe.period].avatarUrl} 
                      alt={mvps[timeframe.period].username}
                      className="w-16 h-16 rounded-full border-2 border-[#D7FF00]"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[#2A2B31] flex items-center justify-center">
                      <span className="text-2xl text-[#D7FF00] font-bold">
                        {mvps[timeframe.period].username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h4 className="text-lg font-heading text-white mb-1">
                      {mvps[timeframe.period].username}
                    </h4>
                    <p className="text-sm text-[#8A8B91]">
                      Rank #{mvps[timeframe.period].rank}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8A8B91]">Wager Amount:</span>
                    <span className="text-white font-mono">
                      ${mvps[timeframe.period].wagerAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8A8B91]">Last Active:</span>
                    <span className="text-white">
                      {formatDistance(new Date(mvps[timeframe.period].lastActive), new Date(), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[#8A8B91] text-center">No data available</p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
