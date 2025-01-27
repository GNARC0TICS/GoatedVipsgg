import { Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

type MVP = {
  username: string;
  wagerAmount: number;
  avatarUrl?: string;
  rank: number;
};

const timeframes = [
  { 
    title: "Daily MVP", 
    period: "daily", 
    colors: {
      primary: "violet-500",
      secondary: "fuchsia-500",
      accent: "violet-500",
      shine: "violet-300"
    }
  },
  { 
    title: "Weekly MVP", 
    period: "weekly", 
    colors: {
      primary: "emerald-500",
      secondary: "teal-500",
      accent: "emerald-500",
      shine: "emerald-300"
    }
  },
  { 
    title: "Monthly MVP", 
    period: "monthly", 
    colors: {
      primary: "amber-500",
      secondary: "orange-500",
      accent: "amber-500",
      shine: "amber-300"
    }
  }
];

// Function to determine VIP tier based on wager amount
function getVipTier(wagerAmount: number) {
  if (wagerAmount >= 1000000) return "DIAMOND";
  if (wagerAmount >= 500000) return "PLATINUM";
  if (wagerAmount >= 100000) return "GOLD";
  if (wagerAmount >= 50000) return "SILVER";
  return "BRONZE";
}

export function MVPCards() {
  const { data: mvps, isLoading } = useQuery<Record<string, MVP>>({
    queryKey: ["/api/mvp-stats"],
  });

  if (isLoading || !mvps) {
    return (
      <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {timeframes.map((timeframe) => (
          <div key={timeframe.period} className="p-6 bg-[#1A1B21]/50 animate-pulse h-48 rounded-xl">
            <div className="h-full"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto perspective-1000">
      {timeframes.map((timeframe) => (
        <motion.div
          key={timeframe.period}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          whileHover={{ 
            scale: 1.02
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30
          }}
          className="group relative transform transition-all duration-300"
        >
          {/* Gradient overlay that appears on hover */}
          <div className={`
            absolute inset-0 
            bg-gradient-to-b from-${timeframe.colors.primary}/20 to-transparent 
            rounded-xl opacity-0 group-hover:opacity-100 
            transition-all duration-300 blur-sm
          `} />

          {/* Main card container */}
          <div className={`
            relative p-4 rounded-xl 
            border border-[#2A2B31] 
            bg-[#1A1B21]/50 backdrop-blur-sm 
            hover:border-${timeframe.colors.primary}/50 
            transition-all duration-300 
            shadow-lg hover:shadow-${timeframe.colors.primary}/20
          `}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className={`h-5 w-5 text-${timeframe.colors.primary}`} />
                <h3 className="text-lg font-heading text-white">{timeframe.title}</h3>
              </div>
            </div>

            {mvps[timeframe.period] ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {mvps[timeframe.period].avatarUrl ? (
                    <img 
                      src={mvps[timeframe.period].avatarUrl} 
                      alt={mvps[timeframe.period].username}
                      className={`w-10 h-10 rounded-full border-2 border-${timeframe.colors.accent}`}
                    />
                  ) : (
                    <div className={`w-10 h-10 rounded-full bg-${timeframe.colors.accent}/20 flex items-center justify-center`}>
                      <span className={`text-base text-${timeframe.colors.shine} font-bold`}>
                        {mvps[timeframe.period].username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h4 className="text-base font-heading text-white">
                      {mvps[timeframe.period].username}
                    </h4>
                    <div className={`text-xs px-2 py-0.5 rounded-full bg-${timeframe.colors.accent}/20 inline-block`}>
                      <span className={`text-${timeframe.colors.shine} font-bold`}>
                        {getVipTier(mvps[timeframe.period].wagerAmount)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm bg-black/40 p-2 rounded-lg">
                  <span className="text-white/70">Total Wagered:</span>
                  <span className="text-white font-mono font-bold">
                    ${mvps[timeframe.period].wagerAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-white/70 text-center text-sm">No data available</p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}