import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Gift, Users, Star } from "lucide-react";

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-[#14151A] text-white">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>

          <div className="prose prose-invert max-w-none">
            <h1 className="text-4xl font-heading text-[#D7FF00] mb-8">
              How Goated x Goombas VIPs Works
            </h1>

            <div className="space-y-8">
              <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31] p-6">
                <h2 className="text-2xl font-heading text-[#D7FF00] mb-4">
                  Getting Started
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <Gift className="h-6 w-6 text-[#D7FF00] mt-1" />
                    <div>
                      <h3 className="text-lg font-heading">Step 1: Sign Up</h3>
                      <p className="text-[#8A8B91]">
                        Register using our official promo codes: GOATEDVIPS or VIPBOOST. 
                        This ensures you're part of our exclusive rewards program.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <Star className="h-6 w-6 text-[#D7FF00] mt-1" />
                    <div>
                      <h3 className="text-lg font-heading">Step 2: Track Progress</h3>
                      <p className="text-[#8A8B91]">
                        Once registered, you can track your progress here at the Goated x Goombas VIP Hub. 
                        Monitor your rankings, achievements, and upcoming rewards.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <Users className="h-6 w-6 text-[#D7FF00] mt-1" />
                    <div>
                      <h3 className="text-lg font-heading">Step 3: Join Community</h3>
                      <p className="text-[#8A8B91]">
                        Get access to our exclusive Telegram channel where you'll receive daily code drops, 
                        available only to our affiliates.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31] p-6">
                <h2 className="text-2xl font-heading text-[#D7FF00] mb-4">
                  Benefits & Rewards
                </h2>
                <ul className="space-y-4 text-[#8A8B91]">
                  <li>• Access to exclusive bonus codes and promotions</li>
                  <li>• Participation in daily wager races with prize pools</li>
                  <li>• VIP-only giveaways and special events</li>
                  <li>• Priority support and dedicated VIP managers</li>
                  <li>• Real-time tracking of your affiliate performance</li>
                  <li>• Additional rakeback and cashback opportunities</li>
                </ul>
              </Card>

              <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31] p-6">
                <h2 className="text-2xl font-heading text-[#D7FF00] mb-4">
                  Maximize Your Rewards
                </h2>
                <div className="space-y-4 text-[#8A8B91]">
                  <p>
                    Our platform is designed to reward active members. Here's how to make the most of your membership:
                  </p>
                  <ul className="space-y-2">
                    <li>• Check the Telegram channel daily for exclusive bonus codes</li>
                    <li>• Participate in daily and weekly wager races</li>
                    <li>• Track your progress on the leaderboards</li>
                    <li>• Engage with the community for tips and strategies</li>
                    <li>• Take advantage of VIP-exclusive promotions</li>
                  </ul>
                </div>
              </Card>

              <div className="bg-[#1A1B21] p-6 rounded-lg border border-[#2A2B31] mt-8">
                <h3 className="text-xl font-heading text-[#D7FF00] mb-4">
                  Ready to Get Started?
                </h3>
                <p className="text-[#8A8B91] mb-4">
                  Join our thriving community of VIP members and start earning exclusive rewards today!
                </p>
                <div className="flex gap-4">
                  <Link href="/telegram">
                    <Button className="bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90">
                      Join Telegram
                    </Button>
                  </Link>
                  <Link href="/leaderboard">
                    <Button variant="outline">
                      View Leaderboard
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}