
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { MessageCircle, Twitter, Star, Zap, Gift, Users } from "lucide-react";
import PageTransition from "@/components/PageTransition";

const features = [
  {
    icon: <Star className="h-6 w-6 text-[#D7FF00]" />,
    title: "Exclusive Updates",
    description: "Be the first to know about new features and promotions"
  },
  {
    icon: <Gift className="h-6 w-6 text-[#D7FF00]" />,
    title: "Special Rewards",
    description: "Access to unique bonus codes and rewards"
  },
  {
    icon: <Zap className="h-6 w-6 text-[#D7FF00]" />,
    title: "Instant Support",
    description: "Get quick assistance from our dedicated team"
  },
  {
    icon: <Users className="h-6 w-6 text-[#D7FF00]" />,
    title: "Community Events",
    description: "Participate in exclusive community challenges"
  }
];

export default function Community() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-[#14151A] pt-16">
        <main className="container mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-16">
              <motion.img
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5 }}
                src="/images/Goated Logo - Yellow.png"
                alt="Goated Logo"
                className="h-24 w-40 mx-auto mb-8 object-contain"
              />
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-5xl font-heading text-white mb-6"
              >
                Join Our <span className="text-[#D7FF00]">Community</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-[#8A8B91] text-xl mb-12 max-w-2xl mx-auto"
              >
                Connect with fellow players, share insights, and stay updated with
                the latest gaming strategies and events.
              </motion.p>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid md:grid-cols-2 gap-6 mb-16"
            >
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 * (index + 1) }}
                  className="bg-[#1A1B21]/50 border border-[#2A2B31] rounded-xl p-6 hover:border-[#D7FF00]/50 transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1">{feature.icon}</div>
                    <div>
                      <h3 className="text-xl font-heading text-white mb-2">{feature.title}</h3>
                      <p className="text-[#8A8B91]">{feature.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-6 justify-center items-center"
            >
              <a
                href="https://t.me/+bnV67QwFmCFlMGFh"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto"
              >
                <Button className="w-full bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90 font-heading text-lg px-8 py-6 h-auto">
                  Join Telegram
                  <MessageCircle className="ml-2 h-5 w-5" />
                </Button>
              </a>

              <a
                href="https://twitter.com/Goatedcom"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto"
              >
                <Button className="w-full bg-[#1DA1F2] text-white hover:bg-[#1DA1F2]/90 font-heading text-lg px-8 py-6 h-auto">
                  Follow Twitter
                  <Twitter className="ml-2 h-5 w-5" />
                </Button>
              </a>
            </motion.div>
          </motion.div>
        </main>
      </div>
    </PageTransition>
  );
}
