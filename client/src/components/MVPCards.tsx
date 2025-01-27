
import { Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

type MVP = {
  username: string;
  wagerAmount: number;
  avatarUrl?: string | null;
  rank: number;
  lastActive: string;
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

function getVipTier(wagerAmount: number) {
  if (wagerAmount >= 1000000) return "DIAMOND";
  if (wagerAmount >= 500000) return "PLATINUM";
  if (wagerAmount >= 100000) return "GOLD";
  if (wagerAmount >= 50000) return "SILVER";
  return "BRONZE";
}

function MVPCard({ 
  timeframe, 
  mvp, 
  isFlipped, 
  onClick,
  isLoading
}: { 
  timeframe: typeof timeframes[number];
  mvp: MVP | null;
  isFlipped: boolean;
  onClick: () => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="h-full rounded-xl bg-[#1A1B21]/50 animate-pulse" />
    );
  }

  return (
    <motion.div
      className="relative w-full h-full perspective-1000 cursor-pointer"
      onClick={onClick}
      initial={false}
      animate={{ rotateY: isFlipped ? 180 : 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30
      }}
    >
      {/* Front of card */}
      <motion.div
        className={`
          absolute inset-0
          rounded-xl overflow-hidden
          bg-gradient-to-br from-[#1A1B21] to-[#2A2B31]
          border border-${timeframe.colors.accent}/20
          shadow-lg
          transition-all duration-300
          ${isFlipped ? 'backface-hidden' : ''}
        `}
        whileHover={{
          scale: 1.02,
          rotateX: 5,
          rotateY: 5,
          z: 50
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-bl from-black/40 via-transparent to-black/40" />

        <div className="relative p-4 md:p-6 h-full">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className={`h-5 w-5 md:h-6 md:w-6 text-${timeframe.colors.accent}`} />
            <h3 className="text-lg md:text-xl font-heading text-white">{timeframe.title}</h3>
          </div>

          {mvp ? (
            <div className="flex flex-col justify-between h-[calc(100%-2rem)]">
              <div className="flex items-center gap-3">
                {mvp.avatarUrl ? (
                  <img 
                    src={mvp.avatarUrl} 
                    alt={mvp.username}
                    className={`w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-${timeframe.colors.accent}`}
                  />
                ) : (
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-${timeframe.colors.accent}/10 flex items-center justify-center`}>
                    <span className="text-lg text-white font-bold">
                      {mvp.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h4 className="text-base md:text-lg font-heading text-white">
                    {mvp.username}
                  </h4>
                  <p className="text-sm text-white/70">
                    Rank #{mvp.rank}
                  </p>
                </div>
              </div>

              <div className="mt-auto">
                <div className="bg-black/20 p-3 rounded-lg">
                  <div className="text-sm text-white/70">Current Wager</div>
                  <div className="text-lg font-mono font-bold text-white">
                    ${mvp.wagerAmount.toLocaleString()}
                  </div>
                </div>
                <div className="text-center text-xs text-white/50 mt-2">Click to view stats</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[calc(100%-2rem)]">
              <p className="text-white/50 text-center text-sm">No data available</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Back of card */}
      <motion.div
        className={`
          absolute inset-0
          rounded-xl overflow-hidden
          bg-gradient-to-br from-[#1A1B21] to-[#2A2B31]
          border border-${timeframe.colors.accent}/20
          shadow-lg
          backface-hidden [transform:rotateY(180deg)]
          ${!isFlipped ? 'pointer-events-none' : ''}
        `}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-bl from-black/40 via-transparent to-black/40" />

        {mvp && (
          <div className="relative p-4 md:p-6">
            <h3 className="text-lg font-heading text-white mb-4">Player Stats</h3>
            <div className="space-y-3">
              <div className="bg-black/20 p-3 rounded-lg">
                <div className="text-sm text-white/70 mb-1">Total Wagered</div>
                <div className="text-lg font-mono font-bold text-white">
                  ${mvp.wagerAmount.toLocaleString()}
                </div>
              </div>
              <div className="bg-black/20 p-3 rounded-lg">
                <div className="text-sm text-white/70 mb-1">VIP Status</div>
                <div className="text-lg font-bold text-white">
                  {getVipTier(mvp.wagerAmount)}
                </div>
              </div>
              <div className="bg-black/20 p-3 rounded-lg">
                <div className="text-sm text-white/70 mb-1">Last Seen</div>
                <div className="text-base text-white">
                  {new Date(mvp.lastActive).toLocaleDateString()}
                </div>
              </div>
              <div className="mt-4 text-center text-xs text-white/50">
                Click to flip back
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export function MVPCards() {
  const { data: mvps, isLoading } = useQuery<Record<string, MVP>>({
    queryKey: ["/api/mvp-stats"],
    refetchInterval: 30000,
    retry: 3,
    staleTime: 10000,
  });

  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  const handleCardClick = (period: string) => {
    setFlippedCards(prev => ({
      ...prev,
      [period]: !prev[period]
    }));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 max-w-5xl mx-auto">
      {timeframes.map((timeframe) => (
        <div key={timeframe.period} className="h-[200px] md:h-[240px]">
          <MVPCard
            timeframe={timeframe}
            mvp={mvps?.[timeframe.period] || null}
            isFlipped={flippedCards[timeframe.period] || false}
            onClick={() => handleCardClick(timeframe.period)}
            isLoading={isLoading}
          />
        </div>
      ))}
    </div>
  );
}
