import { LeaderboardTable } from "@/components/LeaderboardTable";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/5 backdrop-blur-sm fixed top-0 w-full z-50">
        <div className="container mx-auto py-4 px-4 flex items-center justify-between">
          <motion.img 
            src="/logo.svg" 
            alt="Goated"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-8"
          />
          <Link href="/auth">
            <Button className="font-heading uppercase tracking-wider text-sm" variant="outline">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative pt-24">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background" />
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(rgba(215, 255, 0, 0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            backgroundPosition: '-19px -19px'
          }}
        />

        <main className="container relative mx-auto px-4">
          {/* Hero Content */}
          <div className="py-20 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <h1 className="text-5xl md:text-7xl font-heading font-extrabold uppercase bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-primary/60">
                Affiliate Leaderboard
              </h1>
              <p className="text-xl text-muted-foreground font-sans max-w-2xl mx-auto">
                Track and compete with the top performers in real-time. Earn rewards and climb the ranks.
              </p>
            </motion.div>
          </div>

          {/* Leaderboard Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="py-12"
          >
            <div className="backdrop-blur-sm rounded-lg border border-border/5 p-6 bg-background/30">
              <LeaderboardTable />
            </div>
          </motion.div>

          {/* Features Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid md:grid-cols-3 gap-8 py-20"
          >
            {/* Feature 1 */}
            <div className="rounded-lg p-6 backdrop-blur-sm bg-background/30 border border-border/5">
              <h3 className="font-heading text-xl uppercase mb-3">Real-Time Updates</h3>
              <p className="text-muted-foreground font-sans">Track your performance and rankings as they happen with live data updates.</p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-lg p-6 backdrop-blur-sm bg-background/30 border border-border/5">
              <h3 className="font-heading text-xl uppercase mb-3">Weekly Races</h3>
              <p className="text-muted-foreground font-sans">Compete in weekly wager tournaments for massive prize pools.</p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-lg p-6 backdrop-blur-sm bg-background/30 border border-border/5">
              <h3 className="font-heading text-xl uppercase mb-3">Exclusive Rewards</h3>
              <p className="text-muted-foreground font-sans">Earn special bonuses and rewards as you climb the leaderboard ranks.</p>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}