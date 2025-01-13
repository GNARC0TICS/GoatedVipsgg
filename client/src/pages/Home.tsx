import { LeaderboardTable } from "@/components/LeaderboardTable";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#14151A]">
      {/* Header */}
      <header className="border-b border-[#2A2B31] fixed top-0 w-full z-50 bg-[#14151A]/80 backdrop-blur-md">
        <div className="container mx-auto py-4 px-4 flex items-center justify-between">
          <motion.img 
            src="/logo.svg" 
            alt="Goated"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-8"
          />
          <div className="flex items-center gap-4">
            <Link href="/auth">
              <Button className="font-heading uppercase tracking-wider text-sm bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90">
                Play now →
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative pt-24">
        <div className="absolute inset-0 bg-gradient-to-b from-[#D7FF00]/5 via-transparent to-transparent" />

        <main className="container relative mx-auto px-4 py-12">
          <div className="text-center mb-16">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-heading font-extrabold uppercase mb-6 bg-gradient-to-r from-[#D7FF00] via-[#D7FF00]/80 to-[#D7FF00]/60 bg-clip-text text-transparent"
            >
              Exclusive Rewards
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-[#8A8B91] font-sans max-w-2xl mx-auto"
            >
              Join Goated.com for unparalleled gaming, exclusive bonuses, and a top-tier VIP program.
            </motion.p>
          </div>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid md:grid-cols-3 gap-6"
          >
            {/* VIP Transfer */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-b from-[#D7FF00]/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative p-8 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm hover:border-[#D7FF00]/50 transition-colors">
                <h3 className="text-2xl font-heading uppercase mb-4 text-white">VIP Transfer</h3>
                <p className="text-[#8A8B91] mb-6">Transfer your VIP status from other platforms and get cash bonuses.</p>
                <Button variant="link" className="font-heading text-[#D7FF00] p-0 flex items-center gap-2 hover:text-[#D7FF00]/80">
                  Find out more <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Wager Races */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-b from-[#D7FF00]/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative p-8 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm hover:border-[#D7FF00]/50 transition-colors">
                <h3 className="text-2xl font-heading uppercase mb-4 text-white">Wager Races</h3>
                <p className="text-[#8A8B91] mb-6">Compete in exclusive wager races for massive prize pools and rewards.</p>
                <Button variant="link" className="font-heading text-[#D7FF00] p-0 flex items-center gap-2 hover:text-[#D7FF00]/80">
                  How it works <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* VIP Rewards */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-b from-[#D7FF00]/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative p-8 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm hover:border-[#D7FF00]/50 transition-colors">
                <h3 className="text-2xl font-heading uppercase mb-4 text-white">VIP Rewards</h3>
                <p className="text-[#8A8B91] mb-6">Exclusive benefits like instant rakeback, level up bonuses, and monthly rewards.</p>
                <Button variant="link" className="font-heading text-[#D7FF00] p-0 flex items-center gap-2 hover:text-[#D7FF00]/80">
                  Explore VIP Program <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Leaderboard Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-20"
          >
            <div className="rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm p-8">
              <LeaderboardTable />
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}