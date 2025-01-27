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
      primary: "from-violet-500",
      secondary: "to-fuchsia-500",
      accent: "violet-500",
      shine: "violet-300"
    }
  },
  { 
    title: "Weekly MVP", 
    period: "weekly", 
    colors: {
      primary: "from-emerald-500",
      secondary: "to-teal-500",
      accent: "emerald-500",
      shine: "emerald-300"
    }
  },
  { 
    title: "Monthly MVP", 
    period: "monthly", 
    colors: {
      primary: "from-amber-500",
      secondary: "to-orange-500",
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
          initial={{ opacity: 0, y: 20, rotateX: -15 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          whileHover={{ 
            scale: 1.02,
            rotateY: 5,
            rotateX: 5,
            z: 50
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30
          }}
          className={`
            relative transform-gpu
            rounded-xl overflow-hidden
            bg-gradient-to-br ${timeframe.colors.primary} ${timeframe.colors.secondary}
            shadow-xl
          `}
        >
          {/* Shiny overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-bl from-white/5 via-transparent to-black/20" />

          {/* Card content */}
          <div className="relative p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className={`h-6 w-6 text-${timeframe.colors.shine}`} />
                <h3 className="text-xl font-heading text-white">{timeframe.title}</h3>
              </div>
            </div>

            {mvps[timeframe.period] ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {mvps[timeframe.period].avatarUrl ? (
                    <img 
                      src={mvps[timeframe.period].avatarUrl} 
                      alt={mvps[timeframe.period].username}
                      className={`w-12 h-12 rounded-full border-2 border-${timeframe.colors.accent}`}
                    />
                  ) : (
                    <div className={`w-12 h-12 rounded-full bg-${timeframe.colors.accent}/20 flex items-center justify-center`}>
                      <span className={`text-lg text-${timeframe.colors.shine} font-bold`}>
                        {mvps[timeframe.period].username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h4 className="text-lg font-heading text-white">
                      {mvps[timeframe.period].username}
                    </h4>
                    <div className={`text-xs px-2 py-1 rounded-full bg-${timeframe.colors.accent}/20 inline-block`}>
                      <span className={`text-${timeframe.colors.shine} font-bold`}>
                        {getVipTier(mvps[timeframe.period].wagerAmount)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm mt-2 bg-black/20 p-3 rounded-lg">
                  <span className="text-white/70">Total Wagered:</span>
                  <span className="text-white font-mono font-bold">
                    ${mvps[timeframe.period].wagerAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-white/70 text-center text-sm">No data available</p>
            )}

            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-xl transform translate-x-12 -translate-y-8" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-black/20 to-transparent rounded-full blur-xl transform -translate-x-16 translate-y-16" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}