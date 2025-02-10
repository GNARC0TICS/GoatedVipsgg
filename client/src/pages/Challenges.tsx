import { motion } from "framer-motion";
import { Trophy, Timer, ArrowRight, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/PageTransition";

// Challenge data structure
const CHALLENGES = [
  {
    id: 0,
    title: "Recruitment Challenge",
    description: "Refer a new VIP player and earn an instant $50 bonus once they complete a VIP transfer",
    reward: "$50 Bonus",
    category: "VIP",
    isActive: true,
    isNew: true,
    requiresProof: true,
    proofInstructions: "Message @xGoombas on Telegram with:\n- Referred player's identity\n- Their highest VIP level on other platforms\n\nNOTE: Bonus will be credited after your referral completes their VIP transfer"
  },
  {
    id: 1,
    title: "Daily High Roller",
    description: "Reach $50,000 in wagers",
    reward: "$45 Bonus",
    category: "Achievement",
    isActive: true,
    isNew: true,
  },
  {
    id: 2,
    title: "Limbo Master",
    description: "Hit 1000x multiplier on Limbo with min $0.10 bet",
    reward: "$20 Bonus",
    category: "Achievement",
    isActive: true,
    isNew: true,
    requiresProof: true,
    proofInstructions: "Share your bet link in our Telegram group for verification"
  }
];

export default function Challenges() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-[#14151A] text-white">
        <div className="container mx-auto px-4 py-8 md:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Header Section */}
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-heading mb-4">
                Challenges
              </h1>
              <p className="text-[#8A8B91] max-w-2xl mx-auto">
                Complete challenges to earn bonus rewards. New challenges added regularly!
              </p>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
                <CardContent className="p-6 text-center">
                  <h3 className="text-[#8A8B91] font-heading text-sm mb-2">ACTIVE CHALLENGES</h3>
                  <p className="text-2xl font-bold text-white">{CHALLENGES.length}</p>
                </CardContent>
              </Card>
              <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
                <CardContent className="p-6 text-center">
                  <h3 className="text-[#8A8B91] font-heading text-sm mb-2">TOTAL REWARDS</h3>
                  <p className="text-2xl font-bold text-[#D7FF00]">
                    ${CHALLENGES.reduce((sum, challenge) => sum + parseInt(challenge.reward.replace(/\D/g, '')), 0)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
                <CardContent className="p-6 text-center">
                  <h3 className="text-[#8A8B91] font-heading text-sm mb-2">NEW CHALLENGES</h3>
                  <p className="text-2xl font-bold text-white">
                    {CHALLENGES.filter(c => c.isNew).length}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Challenges Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {CHALLENGES.map((challenge) => (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: challenge.id * 0.1 }}
                >
                  <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31] overflow-hidden group hover:border-[#D7FF00]/50 transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <Trophy className="h-8 w-8 text-[#D7FF00]" />
                        <div className="flex gap-2">
                          {challenge.isNew && (
                            <Badge className="bg-[#D7FF00] text-[#14151A]">NEW</Badge>
                          )}
                          <Badge variant="outline">{challenge.category}</Badge>
                        </div>
                      </div>
                      <h3 className="text-xl font-heading mb-2">{challenge.title}</h3>
                      <p className="text-[#8A8B91] mb-4">{challenge.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[#D7FF00] font-heading">{challenge.reward}</span>
                      </div>
                      {challenge.requiresProof && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-[#8A8B91]">
                          <AlertCircle className="h-4 w-4" />
                          <span>{challenge.proofInstructions}</span>
                        </div>
                      )}
                      <Button className="w-full mt-4 bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90">
                        Start Challenge
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}