import { LeaderboardTable } from "@/components/LeaderboardTable";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Trophy, CircleDot, Shield, Coins, Gift } from "lucide-react";
import { FeatureCarousel } from "@/components/FeatureCarousel";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#14151A]">
      <main className="container relative mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
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
            Join Goated.com for unparalleled gaming, exclusive bonuses, and a top-tier VIP program.
          </motion.p>

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
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-b from-[#D7FF00]/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-8 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm hover:border-[#D7FF00]/50 transition-colors">
              <h3 className="text-2xl font-heading uppercase mb-4 text-white">VIP Transfer</h3>
              <p className="text-[#8A8B91] mb-6 font-body">Transfer your VIP status from other platforms and get cash bonuses.</p>
              <Link href="/vip-transfer">
                <span className="font-heading text-[#D7FF00] inline-flex items-center gap-2 hover:text-[#D7FF00]/80 transition-colors cursor-pointer">
                  Find out more <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-b from-[#D7FF00]/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-8 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm hover:border-[#D7FF00]/50 transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-2xl font-heading uppercase text-white">Wager Races</h3>
                <div className="flex items-center gap-1">
                  <CircleDot className="h-3 w-3 text-red-500 animate-pulse" />
                  <span className="text-xs text-[#8A8B91]">LIVE</span>
                </div>
              </div>
              <p className="text-[#8A8B91] mb-6 font-body">Compete in exclusive wager races for massive prize pools and rewards.</p>
              <Link href="/wager-races">
                <span className="font-heading text-[#D7FF00] inline-flex items-center gap-2 hover:text-[#D7FF00]/80 transition-colors cursor-pointer">
                  How it works <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-b from-[#D7FF00]/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-8 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm hover:border-[#D7FF00]/50 transition-colors">
              <h3 className="text-2xl font-heading uppercase mb-4 text-white">VIP Rewards</h3>
              <p className="text-[#8A8B91] mb-6 font-body">Exclusive benefits like instant rakeback, level up bonuses, and monthly rewards.</p>
              <Link href="/vip-program">
                <span className="font-heading text-[#D7FF00] inline-flex items-center gap-2 hover:text-[#D7FF00]/80 transition-colors cursor-pointer">
                  Explore VIP Program <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid md:grid-cols-3 gap-6 mb-20"
        >
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-b from-[#D7FF00]/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-8 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm hover:border-[#D7FF00]/50 transition-colors">
              <Shield className="h-8 w-8 text-[#D7FF00] mb-4" />
              <h3 className="text-2xl font-heading uppercase mb-4 text-white">Provably Fair</h3>
              <p className="text-[#8A8B91] mb-6 font-body">
                All in-house games use a provably fair algorithm to ensure complete transparency and fairness.
                Each game outcome can be independently verified.
              </p>
              <Link href="/provably-fair">
                <Button variant="link" className="font-heading text-[#D7FF00] p-0 flex items-center gap-2 hover:text-[#D7FF00]/80">
                  Learn More <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-b from-[#D7FF00]/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-8 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm hover:border-[#D7FF00]/50 transition-colors">
              <Gift className="h-8 w-8 text-[#D7FF00] mb-4" />
              <h3 className="text-2xl font-heading uppercase mb-4 text-white">Bonus Codes</h3>
              <p className="text-[#8A8B91] mb-6 font-body">
                Exclusive bonus codes updated regularly. Claim special rewards and boost your gaming experience.
              </p>
              <Link href="/bonus-codes">
                <span className="font-heading text-[#D7FF00] inline-flex items-center gap-2 hover:text-[#D7FF00]/80 transition-colors cursor-pointer">
                  View Codes <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-b from-[#D7FF00]/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-8 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm hover:border-[#D7FF00]/50 transition-colors">
              <Coins className="h-8 w-8 text-[#D7FF00] mb-4" />
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-2xl font-heading uppercase text-white">$GOAT Token</h3>
                <span className="text-xs font-heading text-[#D7FF00] px-2 py-1 bg-[#D7FF00]/10 rounded-full">
                  COMING SOON
                </span>
              </div>
              <p className="text-[#8A8B91] mb-6 font-body">
                Upcoming token launch with exclusive benefits for holders. Get airdrops based on your wagered amount
                and unlock special perks.
              </p>
              <Button variant="link" className="font-heading text-[#D7FF00] p-0 flex items-center gap-2 hover:text-[#D7FF00]/80">
                Learn About Airdrops <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
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