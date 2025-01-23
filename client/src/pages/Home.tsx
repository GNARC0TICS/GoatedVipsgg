import { LeaderboardTable } from "@/components/LeaderboardTable";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Trophy, CircleDot, Shield, Coins, Gift } from "lucide-react";
import { FeatureCarousel } from "@/components/FeatureCarousel";

export default function Home() {
  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background pointer-events-none" />
      <main className="container relative mx-auto px-4 py-12">
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
            className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8"
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
          {/* VIP Transfer Card */}
          <Link href="/vip-transfer" className="block">
            <div className="relative group transform transition-all duration-300 hover:scale-[1.02]">
              <div className="p-8 rounded-xl border border-[#2A2B31] bg-card hover:border-[#D7FF00]/50 transition-all duration-300">
                <h3 className="text-2xl font-heading uppercase mb-4">VIP Transfer</h3>
                <p className="text-muted-foreground mb-6">Transfer your VIP status from other platforms and get cash bonuses.</p>
                <span className="font-heading text-[#D7FF00] inline-flex items-center gap-2 hover:text-[#D7FF00]/80 transition-colors cursor-pointer">
                  Find out more <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </Link>

          {/* Wager Races Card */}
          <Link href="/wager-races" className="block">
            <div className="relative group transform transition-all duration-300 hover:scale-[1.02]">
              <div className="p-8 rounded-xl border border-[#2A2B31] bg-card hover:border-[#D7FF00]/50 transition-all duration-300">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-2xl font-heading uppercase">Wager Races</h3>
                  <div className="flex items-center gap-1">
                    <CircleDot className="h-3 w-3 text-red-500 animate-pulse" />
                    <span className="text-xs text-muted-foreground">LIVE</span>
                  </div>
                </div>
                <p className="text-muted-foreground mb-6">Compete in exclusive wager races for massive prize pools and rewards.</p>
                <span className="font-heading text-[#D7FF00] inline-flex items-center gap-2 hover:text-[#D7FF00]/80 transition-colors cursor-pointer">
                  How it works <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </Link>

          {/* VIP Rewards Card */}
          <Link href="/vip-program" className="block">
            <div className="relative group transform transition-all duration-300 hover:scale-[1.02]">
              <div className="p-8 rounded-xl border border-[#2A2B31] bg-card hover:border-[#D7FF00]/50 transition-all duration-300">
                <h3 className="text-2xl font-heading uppercase mb-4">VIP Rewards</h3>
                <p className="text-muted-foreground mb-6">Exclusive benefits like instant rakeback, level up bonuses, and monthly rewards.</p>
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
          {/* Feature Cards */}
          <div className="relative group transform transition-all duration-300 hover:scale-[1.02]">
            <div className="p-8 rounded-xl border border-[#2A2B31] bg-card hover:border-[#D7FF00]/50 transition-all duration-300">
              <Shield className="h-8 w-8 text-[#D7FF00] mb-4" />
              <h3 className="text-2xl font-heading uppercase mb-4">Provably Fair</h3>
              <p className="text-muted-foreground mb-6">
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
            <div className="p-8 rounded-xl border border-[#2A2B31] bg-card hover:border-[#D7FF00]/50 transition-all duration-300">
              <Gift className="h-8 w-8 text-[#D7FF00] mb-4" />
              <h3 className="text-2xl font-heading uppercase mb-4">Bonus Codes</h3>
              <p className="text-muted-foreground mb-6">
                Exclusive bonus codes updated regularly. Claim special rewards and boost your gaming experience.
              </p>
              <Link href="/bonus-codes">
                <span className="font-heading text-[#D7FF00] inline-flex items-center gap-2 hover:text-[#D7FF00]/80 transition-colors cursor-pointer">
                  View Codes <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </div>
          </div>

          <Link href="/goated-token" className="block">
            <div className="relative group transform transition-all duration-300 hover:scale-[1.02]">
              <div className="p-8 rounded-xl border border-[#2A2B31] bg-card hover:border-[#D7FF00]/50 transition-all duration-300">
                <Coins className="h-8 w-8 text-[#D7FF00] mb-4" />
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-2xl font-heading uppercase">$GOATED Token</h3>
                  <span className="text-xs font-heading text-[#D7FF00] px-2 py-1 bg-[#D7FF00]/10 rounded-full">
                    COMING SOON
                  </span>
                </div>
                <p className="text-muted-foreground mb-6">
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
          <div className="rounded-xl border border-[#2A2B31] bg-card p-8">
            <LeaderboardTable />
          </div>
        </motion.div>
      </main>
    </div>
  );
}