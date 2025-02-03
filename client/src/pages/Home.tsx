import { LeaderboardTable } from "@/components/LeaderboardTable";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import {
  ArrowRight,
  Trophy,
  CircleDot,
  Shield,
  Coins,
  Gift,
  Zap,
  MessageSquare,
} from "lucide-react";
import { FeatureCarousel } from "@/components/FeatureCarousel";
import { MVPCards } from "@/components/MVPCards";
import { RaceTimer } from "@/components/RaceTimer";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#14151A]">
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-24 max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mb-8"
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              className="mx-auto h-64 md:h-80 w-auto object-contain"
            >
              <source src="/images/FINAL.mp4" type="video/mp4" />
            </video>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <a 
              href="https://www.Goated.com/r/VIPBOOST" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block group"
            >
              <div className="bg-[#D7FF00]/10 border border-[#D7FF00] rounded-lg p-4 mx-auto max-w-md backdrop-blur-sm relative transition-all duration-300 hover:bg-[#D7FF00]/20">
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
                <div className="absolute inset-x-0 bottom-full mb-2 opacity-0 group-hover:opacity-100 text-[#D7FF00] text-sm text-center transition-all duration-300 bg-[#1A1B21] p-2 rounded-lg">
                  Use code VIPBOOST when signing up to instantly join our VIP program
                </div>
              </div>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-7xl mx-auto mb-16"
          >
            <div className="max-w-4xl mx-auto mb-12">
              <FeatureCarousel />
            </div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-[#8A8B91] max-w-2xl mx-auto mb-12"
            >
              Join an elite community of players at Goated.com, where your
              wagering transforms into rewards. Compete in exclusive wager races,
              claim daily bonus codes, and earn monthly payouts in our
              player-first ecosystem. From live streams to exclusive insights,
              become part of a thriving community where winning strategies are
              shared daily.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-24"
            >
              <h2 className="text-4xl font-heading text-white mb-12 text-center flex items-center justify-center gap-3">
                <Crown className="w-8 h-8 text-[#D7FF00] animate-wiggle" />
                TOP PERFORMERS
              </h2>
              <MVPCards />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-24"
            >
              <h2 className="text-4xl font-heading text-white mb-12 text-center flex items-center justify-center gap-3">
                <Zap className="w-8 h-8 text-[#D7FF00] animate-flicker" />
                EXPLORE OUR FEATURES
              </h2>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12 max-w-7xl mx-auto px-4"
              >
                <Link href="/vip-transfer" className="block">
                  <div className="relative group transform transition-all duration-300 hover:scale-[1.02]">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#D7FF00]/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur-sm" />
                    <div className="relative p-6 md:p-8 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm hover:border-[#D7FF00]/50 transition-all duration-300 shadow-lg hover:shadow-[#FFD700]/20 card-hover h-full flex flex-col justify-between">
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
                    <div className="relative p-6 md:p-8 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm hover:border-[#D7FF00]/50 transition-all duration-300 shadow-lg hover:shadow-[#FFD700]/20 card-hover h-full flex flex-col justify-between">
                      <div className="flex items-center justify-center gap-2 mb-4">
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

                <Link href="/challenges" className="block">
                  <div className="relative group transform transition-all duration-300 hover:scale-[1.02]">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#D7FF00]/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur-sm" />
                    <div className="relative p-6 md:p-8 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm hover:border-[#D7FF00]/50 transition-all duration-300 shadow-lg hover:shadow-[#FFD700]/20 card-hover h-full flex flex-col justify-between">
                      <Trophy className="h-8 w-8 text-[#D7FF00] mb-4" />
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <h3 className="text-2xl font-heading uppercase text-white">
                          Challenges
                        </h3>
                        <span className="text-xs font-heading text-[#D7FF00] px-2 py-1 bg-[#D7FF00]/10 rounded-full">
                          NEW
                        </span>
                      </div>
                      <p className="text-[#8A8B91] mb-6 font-body">
                        Complete daily and weekly challenges to earn exclusive rewards and boost your earnings.
                      </p>
                      <span className="font-heading text-[#D7FF00] inline-flex items-center gap-2 hover:text-[#D7FF00]/80 transition-colors">
                        View Challenges <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </Link>

                <Link href="/vip-program" className="block">
                  <div className="relative group transform transition-all duration-300 hover:scale-[1.02]">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#D7FF00]/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur-sm" />
                    <div className="relative p-6 md:p-8 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm hover:border-[#D7FF00]/50 transition-all duration-300 shadow-lg hover:shadow-[#FFD700]/20 card-hover h-full flex flex-col justify-between">
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
                  <div className="relative p-6 md:p-8 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm hover:border-[#D7FF00]/50 transition-all duration-300 shadow-lg hover:shadow-[#FFD700]/20 card-hover h-full flex flex-col justify-between">
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
                  <div className="relative p-6 md:p-8 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm hover:border-[#D7FF00]/50 transition-all duration-300 shadow-lg hover:shadow-[#FFD700]/20 card-hover h-full flex flex-col justify-between">
                    <Gift className="h-8 w-8 text-[#D7FF00] mb-4" />
                    <h3 className="text-2xl font-heading uppercase mb-4 text-white">
                      Bonus Codes
                    </h3>
                    <p className="text-[#8A8B91] mb-6 font-body">
                      Exclusive bonus codes updated regularly. Claim special rewards
                      and boost your gaming experience.
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
                    <div className="absolute inset-0 bg-gradient-to-b from-[#D7FF00]/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur-sm" />
                    <div className="relative p-6 md:p-8 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm hover:border-[#D7FF00]/50 transition-all duration-300 shadow-lg hover:shadow-[#FFD700]/20 card-hover h-full flex flex-col justify-between">
                      <Coins className="h-8 w-8 text-[#D7FF00] mb-4" />
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <h3 className="text-2xl font-heading uppercase text-white">
                          THE GOATED AIRDROP
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

                <Link href="/promotions" className="block">
                  <div className="relative group transform transition-all duration-300 hover:scale-[1.02]">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#D7FF00]/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur-sm" />
                    <div className="relative p-6 md:p-8 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm hover:border-[#D7FF00]/50 transition-all duration-300 shadow-lg hover:shadow-[#FFD700]/20 card-hover h-full flex flex-col justify-between">
                      <Gift className="h-8 w-8 text-[#D7FF00] mb-4" />
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <h3 className="text-2xl font-heading uppercase text-white">
                          PROMOTIONS
                        </h3>
                        <span className="text-xs font-heading text-[#D7FF00] px-2 py-1 bg-[#D7FF00]/10 rounded-full">
                          DAILY
                        </span>
                      </div>
                      <p className="text-[#8A8B91] mb-6 font-body">
                        Discover daily promotions, bonuses, and special events. Take advantage
                        of exclusive offers and boost your gaming experience.
                      </p>
                      <span className="font-heading text-[#D7FF00] inline-flex items-center gap-2 hover:text-[#D7FF00]/80 transition-colors">
                        View Promotions <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </Link>

                <Link href="/telegram" className="block">
                  <div className="relative group transform transition-all duration-300 hover:scale-[1.02]">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#D7FF00]/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur-sm" />
                    <div className="relative p-6 md:p-8 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm hover:border-[#D7FF00]/50 transition-all duration-300 shadow-lg hover:shadow-[#FFD700]/20 card-hover h-full flex flex-col justify-between">
                      <MessageSquare className="h-8 w-8 text-[#D7FF00] mb-4" />
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <h3 className="text-2xl font-heading uppercase text-white">
                          TELEGRAM GROUP
                        </h3>
                        <span className="text-xs font-heading text-[#D7FF00] px-2 py-1 bg-[#D7FF00]/10 rounded-full">
                          JOIN NOW
                        </span>
                      </div>
                      <p className="text-[#8A8B91] mb-6 font-body">
                        Join our Telegram community for exclusive updates, bonus codes,
                        and instant support. Stay connected with fellow players.
                      </p>
                      <span className="font-heading text-[#D7FF00] inline-flex items-center gap-2 hover:text-[#D7FF00]/80 transition-colors">
                        Join Community <ArrowRight className="h-4 w-4" />
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
                  <h2 className="text-3xl font-heading text-white mb-8 text-center flex items-center justify-center gap-3">
                    <Trophy className="w-7 h-7 text-[#D7FF00]" />
                    DAILY LEADERBOARD
                  </h2>
                  <LeaderboardTable timePeriod="today" />
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mt-16"
              >
                <a 
                  href="https://www.Goated.com/r/VIPBOOST" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block bg-[#D7FF00] text-black font-heading text-xl px-8 py-4 rounded-lg hover:bg-[#D7FF00]/90 transition-all duration-300 transform hover:scale-105"
                >
                  JOIN THE GOATS TODAY! 🐐
                </a>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </main>
      <RaceTimer />
    </div>
  );
}