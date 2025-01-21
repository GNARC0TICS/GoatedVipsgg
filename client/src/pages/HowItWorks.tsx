
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function HowItWorks() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#14151A] text-white">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => setLocation('/wager-races')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Races
          </Button>

          <div className="prose prose-invert max-w-none">
            <h1 className="text-4xl font-heading text-[#D7FF00] mb-8">How Wager Races Work</h1>
            
            <div className="space-y-6">
              <p className="text-lg">
                Every month, the top 10 players within Goombas x Goated Vips compete to win a share 
                of the prize pool when the countdown ends.
              </p>

              <h2 className="text-2xl font-heading text-[#D7FF00] mt-8">How to Participate</h2>
              <p className="text-lg">
                Players can view the Prize, Countdown, Leaderboard and more on the 'Wager Races' page - 
                which can be easily found on the top navigation bar here on Goated Rewards.
              </p>
              
              <h2 className="text-2xl font-heading text-[#D7FF00] mt-8">Race Rules</h2>
              <p className="text-lg">
                The leaderboard is based on total volume wagered for that week and the prize money 
                will be proportional to the percentage of the total volume wagered that each player 
                contributed.
              </p>

              <h2 className="text-2xl font-heading text-[#D7FF00] mt-8">Payouts</h2>
              <p className="text-lg">
                Please note that your winnings will be tipped to your account within the next 24 hours 
                after the race ends. Please check your transactions history to see the payouts.
              </p>

              <div className="bg-[#1A1B21] p-6 rounded-lg border border-[#2A2B31] mt-8">
                <p className="text-lg font-bold text-[#D7FF00]">
                  Start betting and secure your spot on the leaderboard!
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
