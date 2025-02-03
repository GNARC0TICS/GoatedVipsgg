
import { motion } from "framer-motion";
import { Trophy, Timer, ArrowRight, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Challenge data structure
const CHALLENGES = [
  {
    id: 1,
    title: "Daily High Roller",
    description: "Reach $50,000 in daily wagers",
    reward: "$45 Bonus",
    category: "Daily",
    isActive: true,
    isNew: true,
    endTime: "24h",
  },
  {
    id: 2,
    title: "Limbo Master",
    description: "First to hit 1000x multiplier on Limbo with min $0.10 bet",
    reward: "$20 Bonus",
    category: "First Achievement",
    isActive: true,
    isNew: true,
    requiresProof: true,
  },
  {
    id: 3,
    title: "Weekly Warrior",
    description: "Place 1000 bets in a week",
    reward: "$100 Bonus",
    category: "Weekly",
    isActive: true,
    endTime: "7d",
  }
];

export default function Challenges() {
  return (
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
              Daily Challenges
            </h1>
            <p className="text-[#8A8B91] max-w-2xl mx-auto">
              Complete challenges to earn bonus rewards. New challenges added regularly!
            </p>
          </div>

          {/* Challenges Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CHALLENGES.map((challenge) => (
              <Card key={challenge.id} className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31] overflow-hidden group hover:border-[#D7FF00]/50 transition-all duration-300">
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
                    {challenge.endTime && (
                      <div className="flex items-center gap-2 text-sm text-[#8A8B91]">
                        <Timer className="h-4 w-4" />
                        <span>Ends in {challenge.endTime}</span>
                      </div>
                    )}
                  </div>
                  {challenge.requiresProof && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-[#8A8B91]">
                      <AlertCircle className="h-4 w-4" />
                      <span>Requires screenshot proof</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  </div>
  );
}
