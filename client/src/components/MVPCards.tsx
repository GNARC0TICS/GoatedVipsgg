import { Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

type MVP = {
  username: string;
  wagerAmount: number;
  avatarUrl?: string;
  rank: number;
};

const timeframes = [
  { title: "Daily MVP", period: "daily", gradient: "from-[#FFD700]", shadow: "shadow-[#FFD700]" },
  { title: "Weekly MVP", period: "weekly", gradient: "from-[#C0C0C0]", shadow: "shadow-[#C0C0C0]" },
  { title: "Monthly MVP", period: "monthly", gradient: "from-[#CD7F32]", shadow: "shadow-[#CD7F32]" }
];

export function MVPCards() {
  const { data: mvps, isLoading } = useQuery<Record<string, MVP>>({
    queryKey: ["/api/mvp-stats"],
  });

  if (isLoading || !mvps) {
    return (
      <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {timeframes.map((timeframe) => (
          <Card key={timeframe.period} className="p-6 bg-[#1A1B21]/50 animate-pulse h-40">
            <div className="h-full"></div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
      {timeframes.map((timeframe) => (
        <motion.div
          key={timeframe.period}
          initial={{ opacity: 0, y: 20, rotateX: -10 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          whileHover={{ 
            scale: 1.05, 
            rotateY: 5,
            z: 50 
          }}
          drag
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.1}
          whileTap={{ scale: 0.95 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20
          }}
          className={`
            relative overflow-hidden p-6 transform-gpu
            bg-gradient-to-br ${timeframe.gradient}/10 to-transparent
            border border-${timeframe.gradient}/20
            backdrop-blur-sm rounded-xl
            ${timeframe.shadow}/20
            hover:shadow-lg hover:shadow-${timeframe.shadow}/30
            transition-all duration-300
            cursor-grab active:cursor-grabbing
          `}
        >
          <div className="absolute inset-0 bg-gradient-to-b opacity-10 blur-sm" />

          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className={`h-5 w-5 text-${timeframe.gradient}`} />
                <h3 className="text-lg font-heading text-white">{timeframe.title}</h3>
              </div>
            </div>

            {mvps[timeframe.period] ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  {mvps[timeframe.period].avatarUrl ? (
                    <img 
                      src={mvps[timeframe.period].avatarUrl} 
                      alt={mvps[timeframe.period].username}
                      className="w-10 h-10 rounded-full border-2 border-[#D7FF00]"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#2A2B31] flex items-center justify-center">
                      <span className="text-lg text-[#D7FF00] font-bold">
                        {mvps[timeframe.period].username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h4 className="text-base font-heading text-white">
                      {mvps[timeframe.period].username}
                    </h4>
                    <p className="text-xs text-[#8A8B91]">
                      Rank #{mvps[timeframe.period].rank}
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="text-[#8A8B91]">Wagered:</span>
                  <span className="text-white font-mono">
                    ${mvps[timeframe.period].wagerAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-[#8A8B91] text-center text-sm">No data available</p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}