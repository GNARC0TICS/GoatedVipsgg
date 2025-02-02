
import { motion } from "framer-motion";
import { ArrowLeft, Gift, Users, Link as LinkIcon, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

// Animation variants for staggered animations
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100
    }
  }
};

export default function HowItWorks() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#14151A] text-white">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-8"
        >
          <Button
            variant="ghost"
            className="gap-2 hover:bg-[#D7FF00]/10 hover:text-[#D7FF00] transition-all duration-300"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>

          <div className="prose prose-invert max-w-none">
            <motion.h1 
              className="text-5xl font-heading text-[#D7FF00] mb-12 relative"
              variants={itemVariants}
            >
              How It Works
              <span className="block text-lg text-[#8A8B91] mt-2">Your Guide to Maximizing Rewards</span>
            </motion.h1>

            <motion.div className="space-y-6" variants={containerVariants}>
              {/* Step 1 */}
              <motion.section 
                className="bg-[#1A1B21]/50 backdrop-blur-sm p-8 rounded-xl border border-[#2A2B31] transform hover:scale-[1.02] transition-transform duration-300"
                variants={itemVariants}
              >
                <div className="flex items-start gap-6">
                  <div className="mt-1 bg-[#D7FF00]/10 p-3 rounded-lg">
                    <Gift className="h-8 w-8 text-[#D7FF00]" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-heading text-[#D7FF00] mt-0">
                      Step 1: Sign Up with Promo Code
                    </h2>
                    <p className="text-[#8A8B91] mt-4">
                      Start by registering using our official promo codes:
                    </p>
                    <div className="bg-[#2A2B31] p-4 rounded-lg mt-4 flex flex-col gap-2">
                      <code className="text-[#D7FF00] text-xl">GOATEDVIPS</code>
                      <span className="text-sm text-[#8A8B91]">or</span>
                      <code className="text-[#D7FF00] text-xl">VIPBOOST</code>
                    </div>
                  </div>
                </div>
              </motion.section>

              {/* Step 2 */}
              <motion.section 
                className="bg-[#1A1B21]/50 backdrop-blur-sm p-8 rounded-xl border border-[#2A2B31] transform hover:scale-[1.02] transition-transform duration-300"
                variants={itemVariants}
              >
                <div className="flex items-start gap-6">
                  <div className="mt-1 bg-[#D7FF00]/10 p-3 rounded-lg">
                    <LinkIcon className="h-8 w-8 text-[#D7FF00]" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-heading text-[#D7FF00] mt-0">
                      Step 2: Link Your Account
                    </h2>
                    <p className="text-[#8A8B91] mt-4">
                      Connect your account to our VIP Hub to unlock:
                    </p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {["Track wagering progress", "Monitor VIP tier status", "View available rewards", "Access exclusive competitions"].map((item) => (
                        <li key={item} className="flex items-center gap-2 text-[#8A8B91]">
                          <ArrowRight className="h-4 w-4 text-[#D7FF00]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.section>

              {/* Step 3 */}
              <motion.section 
                className="bg-[#1A1B21]/50 backdrop-blur-sm p-8 rounded-xl border border-[#2A2B31] transform hover:scale-[1.02] transition-transform duration-300"
                variants={itemVariants}
              >
                <div className="flex items-start gap-6">
                  <div className="mt-1 bg-[#D7FF00]/10 p-3 rounded-lg">
                    <Users className="h-8 w-8 text-[#D7FF00]" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-heading text-[#D7FF00] mt-0">
                      Step 3: Join Our Community
                    </h2>
                    <p className="text-[#8A8B91] mt-4">
                      Get access to our exclusive Telegram channel for:
                    </p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {["Daily bonus codes", "VIP promotions", "Community updates", "Direct support"].map((item) => (
                        <li key={item} className="flex items-center gap-2 text-[#8A8B91]">
                          <ArrowRight className="h-4 w-4 text-[#D7FF00]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.section>

              {/* Step 4 */}
              <motion.section 
                className="bg-[#1A1B21]/50 backdrop-blur-sm p-8 rounded-xl border border-[#2A2B31] transform hover:scale-[1.02] transition-transform duration-300"
                variants={itemVariants}
              >
                <div className="flex items-start gap-6">
                  <div className="mt-1 bg-[#D7FF00]/10 p-3 rounded-lg">
                    <Zap className="h-8 w-8 text-[#D7FF00]" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-heading text-[#D7FF00] mt-0">
                      Step 4: Start Earning Rewards
                    </h2>
                    <p className="text-[#8A8B91] mt-4">
                      As an official affiliate member, you'll receive:
                    </p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {[
                        "Daily exclusive bonuses",
                        "Monthly race entries",
                        "Special giveaways",
                        "VIP rakeback"
                      ].map((item) => (
                        <li key={item} className="flex items-center gap-2 text-[#8A8B91]">
                          <ArrowRight className="h-4 w-4 text-[#D7FF00]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.section>

              {/* CTA */}
              <motion.div 
                className="bg-[#D7FF00] p-8 rounded-xl mt-12 text-center"
                variants={itemVariants}
              >
                <p className="text-[#14151A] text-xl font-bold mb-4">
                  Ready to get started? Sign up now and begin your VIP journey!
                </p>
                <Button
                  onClick={() => window.open("https://www.goated.com/r/GOATEDVIPS", "_blank")}
                  className="bg-[#14151A] text-white hover:bg-[#14151A]/90 text-lg px-8 py-6"
                >
                  Register with Goombas x Goated VIPs
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
