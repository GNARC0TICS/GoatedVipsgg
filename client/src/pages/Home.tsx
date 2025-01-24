import { LeaderboardTable } from "@/components/LeaderboardTable";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Trophy,
  CircleDot,
  Shield,
  Coins,
  Gift,
} from "lucide-react";
import { FeatureCarousel } from "@/components/FeatureCarousel";
import { useLeaderboard } from "@/hooks/use-leaderboard";

export default function Home() {
  const { data: leaderboardData } = useLeaderboard("monthly");
  const data = leaderboardData || [];
  return (
    <div className="min-h-screen bg-[#14151A]">
      <main className="container relative mx-auto px-4 py-12">
        <div className="text-center mb-24 max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mb-8"
          >
            <img
              src="/images/Goated logo with text.png"
              alt="Goated"
              className="mx-auto h-56 md:h-72 w-auto object-contain wiggle-animation"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="bg-[#D7FF00]/10 border border-[#D7FF00] rounded-lg p-4 mx-auto max-w-md backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-[#D7FF00] animate-pulse" />
                  <span className="text-white font-heading">
                    NEW USER PROMO:
                  </span>
                </div>
                <div className="bg-[#D7FF00] px-3 py-1 rounded font-mono text-black font-bold tracking-wider">
                  VIPBOOST
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4 mb-8"
          >
            {data?.length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#D7FF00]/10 border border-[#D7FF00] rounded-lg p-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-[#FFD700]" />
                        <span className="text-white font-heading">
                          WEEKLY MVP:
                        </span>
                      </div>
                      {(() => {
                        const weeklyLeader = [...data].sort(
                          (a, b) =>
                            (b.wagered?.this_week || 0) -
                            (a.wagered?.this_week || 0),
                        )[0];
                        return (
                          weeklyLeader && (
                            <button
                              onClick={() =>
                                window.dispatchEvent(
                                  new CustomEvent("openQuickProfile", {
                                    detail: weeklyLeader.uid,
                                  }),
                                )
                              }
                              className="font-mono text-[#D7FF00] hover:text-white transition-colors"
                            >
                              {weeklyLeader.name} ($
                              {weeklyLeader.wagered?.this_week?.toLocaleString() ||
                                "0"}
                              )
                            </button>
                          )
                        );
                      })()}
                    </div>
                  </div>

                  <div className="bg-[#D7FF00]/10 border border-[#D7FF00] rounded-lg p-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-[#FFD700]" />
                        <span className="text-white font-heading">
                          DAILY MVP:
                        </span>
                      </div>
                      {(() => {
                        const dailyLeader = [...data].sort(
                          (a, b) =>
                            (b.wagered?.today || 0) - (a.wagered?.today || 0),
                        )[0];
                        return (
                          dailyLeader && (
                            <button
                              onClick={() =>
                                window.dispatchEvent(
                                  new CustomEvent("openQuickProfile", {
                                    detail: dailyLeader.uid,
                                  }),
                                )
                              }
                              className="font-mono text-[#D7FF00] hover:text-white transition-colors"
                            >
                              {dailyLeader.name} ($
                              {dailyLeader.wagered?.today?.toLocaleString() ||
                                "0"}
                              )
                            </button>
                          )
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <FeatureCarousel />
          </div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-[#8A8B91] max-w-2xl mx-auto mb-8"
          >
            Join an elite community of players at Goated.com, where your
            wagering transforms into rewards. Compete in exclusive wager races,
            claim daily bonus codes, and earn monthly payouts in our
            player-first ecosystem. From live streams to exclusive insights,
            become part of a thriving community where winning strategies are
            shared daily.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-3 gap-8 mb-12 max-w-7xl mx-auto"
        >
          <Link href="/vip-transfer" className="block">
            <div className="relative group transform transition-all duration-300 hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-b from-[#D7FF00]/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur-sm" />
              <div className="relative p-8 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm hover:border-[#D7FF00]/50 transition-all duration-300 shadow-lg hover:shadow-[#D7FF00]/20 card-hover">
                <h3 className="text-2xl font-heading uppercase mb-4 text-white">
                  VIP Transfer
                </h3>
                <p className="text-[#8A8B91] mb-6 font-body">
                  Transfer your VIP status from other platforms and get cash
                  bonuses.
                </p>
                <span className="font-heading text-[#D7FF00] inline-flex items-center gap-2 hover:text-[#D7FF00]/80 transition-colors cursor-pointer">
                  Find out more <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </Link>

          <Link href="/wager-races" className="block">
            <div className="relative group transform transition-all duration-300 hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-b from-[#D7FF00]/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur-sm" />
              <div className="relative p-8 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm hover:border-[#D7FF00]/50 transition-all duration-300 shadow-lg hover:shadow-[#D7FF00]/20 card-hover">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-2xl font-heading uppercase text-white">
                    Wager Races
                  </h3>
                  <div className="flex items-center gap-1">
                    <CircleDot className="h-3 w-3 text-red-500 animate-pulse" />
                    <span className="text-xs text-[#8A8B91]">LIVE</span>
                  </div>
                </div>
                <p className="text-[#8A8B91] mb-6 font-body">
                  Compete in exclusive wager races for massive prize pools and
                  rewards.
                </p>
                <span className="font-heading text-[#D7FF00] inline-flex items-center gap-2 hover:text-[#D7FF00]/80 transition-colors cursor-pointer">
                  How it works <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </Link>

          <Link href="/vip-program" className="block">
            <div className="relative group transform transition-all duration-300 hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-b from-[#D7FF00]/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur-sm" />
              <div className="relative p-8 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm hover:border-[#D7FF00]/50 transition-all duration-300 shadow-lg hover:shadow-[#D7FF00]/20 card-hover">
                <h3 className="text-2xl font-heading uppercase mb-4 text-white">
                  VIP Rewards
                </h3>
                <p className="text-[#8A8B91] mb-6 font-body">
                  Exclusive benefits like instant rakeback, level up bonuses,
                  and monthly rewards.
                </p>
                <span className="font-heading text-[#D7FF00] inline-flex items-center gap-2 hover:text-[#D7FF00]/80 transition-colors cursor-pointer">
                  Explore VIP Program <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid md:grid-cols-3 gap-6 mb-20"
        >
          <div className="relative group transform transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-b from-[#D7FF00]/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur-sm" />
            <div className="relative p-8 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm hover:border-[#D7FF00]/50 transition-all duration-300 shadow-lg hover:shadow-[#D7FF00]/20 card-hover">
              <Shield className="h-8 w-8 text-[#D7FF00] mb-4" />
              <h3 className="text-2xl font-heading uppercase mb-4 text-white">
                Provably Fair
              </h3>
              <p className="text-[#8A8B91] mb-6 font-body">
                All in-house games use a provably fair algorithm to ensure
                complete transparency and fairness. Each game outcome can be
                independently verified.
              </p>
              <Link href="/provably-fair">
                <span className="font-heading text-[#D7FF00] inline-flex items-center gap-2 hover:text-[#D7FF00]/80 transition-colors cursor-pointer">
                  Learn More <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </div>
          </div>

          <div className="relative group transform transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-b from-[#D7FF00]/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur-sm" />
            <div className="relative p-8 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm hover:border-[#D7FF00]/50 transition-all duration-300 shadow-lg hover:shadow-[#D7FF00]/20 card-hover">
              <Gift className="h-8 w-8 text-[#D7FF00] mb-4" />
              <h3 className="text-2xl font-heading uppercase mb-4 text-white">
                Bonus Codes
              </h3>
              <p className="text-[#8A8B91] mb-6 font-body">
                Exclusive bonus codes updated regularly. Claim special rewards
                and boost your gaming experience.
              </p>
              <Link to="/bonus-codes">
                <span className="font-heading text-[#D7FF00] inline-flex items-center gap-2 hover:text-[#D7FF00]/80 transition-colors cursor-pointer">
                  View Codes <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </div>
          </div>

          <Link href="/goated-token" className="block">
            <div className="relative group transform transition-all duration-300 hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-b from-[#D7FF00]/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur-sm" />
              <div className="relative p-8 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm hover:border-[#D7FF00]/50 transition-all duration-300 shadow-lg hover:shadow-[#D7FF00]/20 card-hover">
                <Coins className="h-8 w-8 text-[#D7FF00] mb-4" />
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-2xl font-heading uppercase text-white">
                    $GOATED Token
                  </h3>
                  <span className="text-xs font-heading text-[#D7FF00] px-2 py-1 bg-[#D7FF00]/10 rounded-full">
                    COMING SOON
                  </span>
                </div>
                <p className="text-[#8A8B91] mb-6 font-body">
                  Upcoming token launch with exclusive benefits for holders. Get
                  airdrops based on your wagered amount and unlock special
                  perks.
                </p>
                <span className="font-heading text-[#D7FF00] inline-flex items-center gap-2 hover:text-[#D7FF00]/80 transition-colors">
                  Learn About Airdrops <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm p-8 max-w-7xl mx-auto">
            <h2 className="text-3xl font-heading text-white mb-8 text-center">
              LEADERBOARD
            </h2>
            <LeaderboardTable />
          </div>
        </motion.div>
      </main>
    </div>
  );
}
