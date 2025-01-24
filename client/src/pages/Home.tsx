import { LeaderboardTable } from "@/components/LeaderboardTable";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Trophy, CircleDot, Shield, Coins, Gift } from "lucide-react";
import { FeatureCarousel } from "@/components/FeatureCarousel";
import { useLeaderboard } from "@/hooks/use-leaderboard";

export default function Home() {
  const { data: leaderboardData } = useLeaderboard('monthly');
  const data = leaderboardData || [];
  return (
    <div className="min-h-screen bg-[#14151A]">
      <main className="container relative mx-auto px-4 py-12">
        <div className="flex justify-center gap-2 py-2 px-4 bg-[#1A1B21]/80 border-b border-[#2A2B31]">
          <a 
            href="https://www.Goated.com/r/VIPBOOST" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded hover:bg-[#D7FF00]/5 transition-all duration-300"
          >
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-[#D7FF00]" />
              <span className="text-[#D7FF00] text-sm font-mono tracking-wider">VIPBOOST</span>
            </div>
          </a>

          {data && data[0] && (
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('openQuickProfile', { detail: data[0].id }))}
              className="px-3 py-1.5 rounded hover:bg-[#D7FF00]/5 transition-all duration-300"
            >
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-[#FFD700]" />
                <span className="text-[#D7FF00] text-sm font-mono">
                  MVP: {data[0].name} (${data[0].wagered?.this_month?.toLocaleString() || '0'})
                </span>
              </div>
            </button>
          )}
        </div>

        <div className="text-center mb-16">
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

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-[#8A8B91] max-w-2xl mx-auto mb-8"
          >
            Join an elite community of players at Goated.com, where your wagering transforms into rewards. Compete in exclusive wager races, claim daily bonus codes, and earn monthly payouts in our player-first ecosystem. From live streams to exclusive insights, become part of a thriving community where winning strategies are shared daily.
          </motion.p>

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
                  <span className="text-white font-heading">NEW USER PROMO:</span>
                </div>
                <div className="bg-[#D7FF00] px-3 py-1 rounded font-mono text-black font-bold tracking-wider">
                  VIP BOOST
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            {data && data[0] && (
              <div className="bg-gradient-to-r from-[#1A1B21]/90 to-[#1A1B21]/70 border border-[#D7FF00]/20 rounded-lg p-4 mx-auto max-w-md backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-6 w-6 text-[#FFD700]" />
                    <div>
                      <h3 className="text-white font-heading text-lg">Monthly MVP</h3>
                      <p className="text-[#D7FF00] font-mono">{data[0].name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white/60 text-sm">Wagered</p>
                    <p className="text-[#D7FF00] font-mono font-bold">
                      ${data[0].wagered?.this_month?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <FeatureCarousel />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-3 gap-6 mb-6"
        >
          <Link href="/vip-transfer" className="block">
            <div className="relative group transform transition-all duration-300 hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-b from-[#D7FF00]/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur-sm" />
              <div className="relative p-8 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm hover:border-[#D7FF00]/50 transition-all duration-300 shadow-lg hover:shadow-[#D7FF00]/20 card-hover">
                <h3 className="text-2xl font-heading uppercase mb-4 text-white">VIP Transfer</h3>
                <p className="text-[#8A8B91] mb-6 font-body">Transfer your VIP status from other platforms and get cash bonuses.</p>
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
                  <h3 className="text-2xl font-heading uppercase text-white">Wager Races</h3>
                  <div className="flex items-center gap-1">
                    <CircleDot className="h-3 w-3 text-red-500 animate-pulse" />
                    <span className="text-xs text-[#8A8B91]">LIVE</span>
                  </div>
                </div>
                <p className="text-[#8A8B91] mb-6 font-body">Compete in exclusive wager races for massive prize pools and rewards.</p>
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
                <h3 className="text-2xl font-heading uppercase mb-4 text-white">VIP Rewards</h3>
                <p className="text-[#8A8B91] mb-6 font-body">Exclusive benefits like instant rakeback, level up bonuses, and monthly rewards.</p>
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
              <h3 className="text-2xl font-heading uppercase mb-4 text-white">Provably Fair</h3>
              <p className="text-[#8A8B91] mb-6 font-body">
                All in-house games use a provably fair algorithm to ensure complete transparency and fairness.
                Each game outcome can be independently verified.
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
              <h3 className="text-2xl font-heading uppercase mb-4 text-white">Bonus Codes</h3>
              <p className="text-[#8A8B91] mb-6 font-body">
                Exclusive bonus codes updated regularly. Claim special rewards and boost your gaming experience.
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
                  <h3 className="text-2xl font-heading uppercase text-white">$GOATED Token</h3>
                  <span className="text-xs font-heading text-[#D7FF00] px-2 py-1 bg-[#D7FF00]/10 rounded-full">
                    COMING SOON
                  </span>
                </div>
                <p className="text-[#8A8B91] mb-6 font-body">
                  Upcoming token launch with exclusive benefits for holders. Get airdrops based on your wagered amount
                  and unlock special perks.
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
          <div className="rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm p-8">
            <LeaderboardTable />
          </div>
        </motion.div>
      </main>
    </div>
  );
}