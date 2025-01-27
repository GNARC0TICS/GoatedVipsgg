import { motion } from "framer-motion";
import { ArrowLeft, Gift, Users, Link as LinkIcon, Zap } from "lucide-react";
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
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>

          <div className="prose prose-invert max-w-none">
            <h1 className="text-4xl font-heading text-[#D7FF00] mb-8">
              How It Works - Maximize Your Rewards
            </h1>

            <div className="space-y-8">
              {/* Step 1: Sign Up */}
              <section className="bg-[#1A1B21]/50 backdrop-blur-sm p-6 rounded-lg border border-[#2A2B31]">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    <Gift className="h-8 w-8 text-[#D7FF00]" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-heading text-[#D7FF00] mt-0">
                      Step 1: Sign Up with Promo Code
                    </h2>
                    <p className="text-[#8A8B91] mt-4">
                      Start by registering on Goated using one of our official promo codes:
                    </p>
                    <div className="bg-[#2A2B31] p-4 rounded-lg mt-4 flex flex-col gap-2">
                      <code className="text-[#D7FF00]">GOATEDVIPS</code>
                      <span className="text-sm text-[#8A8B91]">or</span>
                      <code className="text-[#D7FF00]">VIPBOOST</code>
                    </div>
                    <p className="text-[#8A8B91] mt-4">
                      Using these codes ensures you're eligible for exclusive rewards and
                      benefits through our VIP program.
                    </p>
                  </div>
                </div>
              </section>

              {/* Step 2: Track Progress */}
              <section className="bg-[#1A1B21]/50 backdrop-blur-sm p-6 rounded-lg border border-[#2A2B31]">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    <LinkIcon className="h-8 w-8 text-[#D7FF00]" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-heading text-[#D7FF00] mt-0">
                      Step 2: Link Your Account
                    </h2>
                    <p className="text-[#8A8B91] mt-4">
                      After registration, connect your account to our Goated x Goombas VIP
                      Hub to:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-[#8A8B91] mt-4">
                      <li>Track your wagering progress</li>
                      <li>Monitor your VIP tier status</li>
                      <li>View available rewards and bonuses</li>
                      <li>Participate in exclusive competitions</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Step 3: Join Community */}
              <section className="bg-[#1A1B21]/50 backdrop-blur-sm p-6 rounded-lg border border-[#2A2B31]">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    <Users className="h-8 w-8 text-[#D7FF00]" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-heading text-[#D7FF00] mt-0">
                      Step 3: Join Our Community
                    </h2>
                    <p className="text-[#8A8B91] mt-4">
                      Get access to our exclusive Telegram channel where you'll find:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-[#8A8B91] mt-4">
                      <li>Daily bonus code drops</li>
                      <li>Exclusive VIP promotions</li>
                      <li>Community updates and announcements</li>
                      <li>Direct support from our team</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Step 4: Rewards */}
              <section className="bg-[#1A1B21]/50 backdrop-blur-sm p-6 rounded-lg border border-[#2A2B31]">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    <Zap className="h-8 w-8 text-[#D7FF00]" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-heading text-[#D7FF00] mt-0">
                      Step 4: Start Earning Rewards
                    </h2>
                    <p className="text-[#8A8B91] mt-4">
                      As an official affiliate member, you'll be eligible for:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-[#8A8B91] mt-4">
                      <li>Daily affiliate-exclusive bonus codes</li>
                      <li>Entry into monthly wager race competitions</li>
                      <li>Special giveaways and promotions</li>
                      <li>VIP rewards and rakeback</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Call to Action */}
              <div className="bg-[#D7FF00] p-6 rounded-lg mt-8">
                <p className="text-[#14151A] text-lg font-bold">
                  Ready to get started? Sign up now and begin your VIP journey!
                </p>
                <Button
                  onClick={() =>
                    window.open("https://www.goated.com/r/GOATEDVIPS", "_blank")
                  }
                  className="mt-4 bg-[#14151A] text-white hover:bg-[#14151A]/90"
                >
                  Register with GOATEDVIPS
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}