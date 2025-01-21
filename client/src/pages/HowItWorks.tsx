
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

          <div className="bg-[#1A1B21]/50 backdrop-blur-sm rounded-xl border border-[#2A2B31] p-8">
            <h1 className="text-3xl font-heading font-bold text-[#D7FF00] mb-8">How Wager Races Work</h1>
            
            <div className="space-y-6 text-[#8A8B91]">
              <p>Every month, the top 10 players within Goombas x Goated Vips compete to win a share of the prize pool when the countdown ends.</p>
              
              <p>Players can view the Prize, Countdown, Leaderboard and more on the 'Wager Races' page - which can be easily found on the top navigation bar here on Goated Rewards.</p>
              
              <p>The leaderboard is based on total volume wagered for that week and the prize money will be proportional to the percentage of the total volume wagered that each player contributed.</p>
              
              <p>Please note that your winnings will be tipped to your account within the next 24 hours after the race ends. Please check your transactions history to see the payouts.</p>
              
              <div className="pt-4">
                <p className="text-[#D7FF00] font-heading">Ready to compete?</p>
                <p className="text-white">Start betting and secure your spot on the leaderboard!</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
