import { LeaderboardTable } from "@/components/LeaderboardTable";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto py-6 flex items-center justify-between">
        <motion.img 
          src="/logo.svg" 
          alt="Goated"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="h-8"
        />
        <Link href="/auth">
          <Button variant="outline">Sign In</Button>
        </Link>
      </header>

      <main className="container mx-auto py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold mb-4">Wager Leaderboard</h1>
          <p className="text-muted-foreground">Track the top players in real-time</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <LeaderboardTable />
        </motion.div>
      </main>
    </div>
  );
}
