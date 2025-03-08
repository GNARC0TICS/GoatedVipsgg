import { motion } from "framer-motion";
import { ArrowLeft, Gift, Trophy, Users, Coins } from "lucide-react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function GoatedToken() {
  return (
    <div className="min-h-screen bg-[#14151A] text-white">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#D7FF00] hover:text-[#D7FF00]/80 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <div className="prose prose-invert max-w-none">
            <h1 className="text-4xl font-heading text-[#D7FF00] mb-8">
              $GOATED Token Airdrop
            </h1>

            <Card className="p-6 bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31] mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="flex items-start gap-4">
                  <Gift className="h-8 w-8 text-[#D7FF00]" />
                  <div>
                    <h3 className="font-heading text-lg text-white mb-2">
                      Daily Distribution
                    </h3>
                    <p className="text-[#8A8B91]">
                      2,000,000 points allocated daily
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Trophy className="h-8 w-8 text-[#D7FF00]" />
                  <div>
                    <h3 className="font-heading text-lg text-white mb-2">
                      Early Adopters
                    </h3>
                    <p className="text-[#8A8B91]">100M tokens reserved</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Users className="h-8 w-8 text-[#D7FF00]" />
                  <div>
                    <h3 className="font-heading text-lg text-white mb-2">
                      Community Rewards
                    </h3>
                    <p className="text-[#8A8B91]">
                      900M tokens for active users
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Coins className="h-8 w-8 text-[#D7FF00]" />
                  <div>
                    <h3 className="font-heading text-lg text-white mb-2">
                      Affiliate Bonus
                    </h3>
                    <p className="text-[#8A8B91]">
                      15% of referred user points
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <h2 className="text-2xl font-heading text-[#D7FF00] mt-12 mb-6">
              How to Participate
            </h2>
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-[#1A1B21]/30 border border-[#2A2B31]">
                <span className="text-[#D7FF00] font-heading text-xl">1</span>
                <p className="text-[#8A8B91]">
                  Register on the Goated platform
                </p>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-lg bg-[#1A1B21]/30 border border-[#2A2B31]">
                <span className="text-[#D7FF00] font-heading text-xl">2</span>
                <p className="text-[#8A8B91]">
                  Start earning points through casino games or sports bets
                </p>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-lg bg-[#1A1B21]/30 border border-[#2A2B31]">
                <span className="text-[#D7FF00] font-heading text-xl">3</span>
                <p className="text-[#8A8B91]">
                  Refer friends to increase your allocation
                </p>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-lg bg-[#1A1B21]/30 border border-[#2A2B31]">
                <span className="text-[#D7FF00] font-heading text-xl">4</span>
                <p className="text-[#8A8B91]">
                  Track your progress on the Airdrop Page
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-heading text-[#D7FF00] mt-12 mb-6">
              What's Next
            </h2>
            <ul className="list-disc list-inside space-y-4 text-[#8A8B91] mb-8">
              <li>Ongoing airdrop program over the next few months</li>
              <li>
                Public sale through Liquidity Bootstrapping Protocol (LBP)
              </li>
              <li>Community treasury funding and liquidity seeding</li>
            </ul>

            <div className="bg-[#1A1B21] p-6 rounded-lg border border-[#2A2B31] mt-8">
              <h3 className="text-xl font-heading text-[#D7FF00] mb-4">
                Why Join?
              </h3>
              <p className="text-[#8A8B91]">
                Goated's $GOATED token is designed to reward loyalty,
                incentivize engagement, and fuel growth across the platform's
                ecosystem. With a capped supply and deflationary model, $GOATED
                is a valuable opportunity for early adopters and consistent
                participants.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
