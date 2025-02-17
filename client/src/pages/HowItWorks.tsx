import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Gift, Users, Link as LinkIcon, Zap, ArrowRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

// Animation variants for staggered animations
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
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

          <motion.div variants={itemVariants} className="text-center mb-12">
            <h1 className="text-5xl font-heading mb-4">
              <span className="text-5xl font-heading text-white glow-text-white">GET STARTED </span>
              <span className="text-5xl font-heading text-[#D7FF00] glow-text-yellow">WITH GOATED VIPS</span>
            </h1>
            <p className="text-xl text-[#8A8B91]">
              Follow these simple steps to join our exclusive community
            </p>
          </motion.div>

          <div className="grid gap-12 mt-8">
            {/* Step 1 */}
            <motion.div
              variants={itemVariants}
              className="bg-[#1A1B21]/50 rounded-xl border border-[#2A2B31] p-8 transform hover:scale-[1.02] transition-all duration-300"
            >
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl font-heading text-[#D7FF00]">01</span>
                    <h2 className="text-2xl font-heading text-white">Open Registration</h2>
                  </div>
                  <p className="text-[#8A8B91]">
                    After creating an account on Goatedvips.gg, head over to Goated and create an account under our code. From there, you can sign up using:
                  </p>
                  <ul className="space-y-2 text-[#8A8B91]">
                    <li className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-[#D7FF00]" />
                      Crypto wallet
                    </li>
                    <li className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-[#D7FF00]" />
                      Google account
                    </li>
                    <li className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-[#D7FF00]" />
                      Email and password
                    </li>
                  </ul>
                </div>
                <div className="rounded-xl overflow-hidden border border-[#2A2B31] max-w-[500px] mx-auto md:mx-0">
                  <video autoPlay loop muted playsInline className="w-full h-auto md:max-h-[280px] object-contain">
                    <source src="/images/How/step1.mp4" type="video/mp4" />
                  </video>
                </div>
              </div>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              variants={itemVariants}
              className="bg-[#1A1B21]/50 rounded-xl border border-[#2A2B31] p-8 transform hover:scale-[1.02] transition-all duration-300"
            >
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl font-heading text-[#D7FF00]">02</span>
                    <h2 className="text-2xl font-heading text-white">Enter Your Details</h2>
                  </div>
                  <p className="text-[#8A8B91]">
                    Create your account by providing:
                  </p>
                  <ul className="space-y-2 text-[#8A8B91]">
                    <li className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-[#D7FF00]" />
                      Email address
                    </li>
                    <li className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-[#D7FF00]" />
                      Secure password
                    </li>
                    <li className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-[#D7FF00]" />
                      Unique username
                    </li>
                  </ul>
                </div>
                <div className="rounded-xl overflow-hidden border border-[#2A2B31] max-w-[500px] mx-auto md:mx-0">
                  <video autoPlay loop muted playsInline className="w-full h-auto md:max-h-[280px] object-contain">
                    <source src="/images/How/step2.mp4" type="video/mp4" />
                  </video>
                </div>
              </div>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              variants={itemVariants}
              className="bg-[#1A1B21]/50 rounded-xl border border-[#2A2B31] p-8 transform hover:scale-[1.02] transition-all duration-300"
            >
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl font-heading text-[#D7FF00]">03</span>
                    <h2 className="text-2xl font-heading text-white">Enter Referral Code</h2>
                  </div>
                  <p className="text-[#8A8B91]">
                    Complete your registration using our official code:
                  </p>
                  <div className="bg-[#2A2B31] p-4 rounded-lg">
                    <code className="text-[#D7FF00] text-xl">GOATEDVIPS</code>
                  </div>
                  <p className="text-[#8A8B91]">
                    This gives you instant access to:
                  </p>
                  <ul className="space-y-2 text-[#8A8B91]">
                    <li className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-[#D7FF00]" />
                      Exclusive rewards
                    </li>
                    <li className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-[#D7FF00]" />
                      VIP Telegram group
                    </li>
                    <li className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-[#D7FF00]" />
                      Stats tracking
                    </li>
                  </ul>
                </div>
                <div className="rounded-xl overflow-hidden border border-[#2A2B31] max-w-[500px] mx-auto md:mx-0">
                  <video autoPlay loop muted playsInline className="w-full h-auto md:max-h-[280px] object-contain">
                    <source src="/images/How/Step3.mp4" type="video/mp4" />
                  </video>
                </div>
              </div>
            </motion.div>

            {/* Completion Summary */}
            <motion.div
              variants={itemVariants}
              className="bg-[#1A1B21]/50 rounded-xl border border-[#2A2B31] p-8 mt-12 text-center"
            >
              <h2 className="text-2xl font-heading text-white mb-4">What's Next?</h2>
              <p className="text-[#8A8B91] mb-6">
                Now that you're signed up, you'll instantly gain access to:
              </p>
              <ul className="space-y-3 text-[#8A8B91] mb-8">
                <li className="flex items-center gap-2 justify-center">
                  <TrendingUp className="h-5 w-5 text-[#D7FF00]" />
                  Real-time wager statistics tracking
                </li>
                <li className="flex items-center gap-2 justify-center">
                  <Users className="h-5 w-5 text-[#D7FF00]" />
                  <a href="https://t.me/goatedvips" target="_blank" rel="noopener noreferrer" className="text-[#D7FF00] hover:underline">
                    Exclusive Telegram group
                  </a>
                </li>
                <li className="flex items-center gap-2 justify-center">
                  <Gift className="h-5 w-5 text-[#D7FF00]" />
                  Exclusive bonus codes and promotions
                </li>
                <li className="flex items-center gap-2 justify-center">
                  <Zap className="h-5 w-5 text-[#D7FF00]" />
                  Access to challenges and wager races
                </li>
              </ul>
            </motion.div>

            {/* CTA Section */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center bg-[#D7FF00] p-8 rounded-xl mt-12"
            >
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="bg-[#14151A]/10 p-1.5 rounded-full border-2 border-[#14151A]/20">
                  <img src="/images/Goated Emblems/diamond.ddf47a1e.svg" alt="Diamond tier" className="w-8 h-8 drop-shadow-md" />
                </div>
                <h2 className="text-[#14151A] text-2xl font-bold">Ready to join the elite?</h2>
              </div>
              <Button
                onClick={() => window.open("https://www.goated.com/r/GOATEDVIPS", "_blank")}
                className="bg-[#14151A] text-white hover:bg-[#14151A]/90 text-lg px-8 py-6 group-hover:scale-105 transition-all duration-300"
              >
                Register with GOATEDVIPS
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}