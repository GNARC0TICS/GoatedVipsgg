import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Info } from "lucide-react";

const vipLevels = [
  { wagered: "100,000", requirement: "10,000", bonus: "55", level: "Gold 1" },
  { wagered: "450,000", requirement: "50,000", bonus: "280", level: "Platinum 1" },
  { wagered: "1,300,000", requirement: "120,000", bonus: "675", level: "Pearl 1" },
  { wagered: "3,000,000", requirement: "250,000", bonus: "1,400", level: "Sapphire 1" },
  { wagered: "7,000,000", requirement: "500,000", bonus: "2,800", level: "Emerald 1" },
  { wagered: "20,000,000", requirement: "1,000,000", bonus: "5,625", level: "Diamond 1" },
];

export default function VipTransfer() {
  const [email, setEmail] = useState("");

  return (
    <div className="min-h-screen bg-[#14151A] text-white">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto px-4 py-16"
      >
        <h1 className="font-heading text-5xl font-extrabold mb-6 text-[#D7FF00]">
          Goated.com VIP Transfer Promotion:
        </h1>
        <h2 className="font-heading text-4xl font-bold mb-8">
          Unlock Higher VIP Levels with Ease!
        </h2>
        
        <div className="prose prose-invert max-w-none mb-12">
          <p className="text-lg leading-relaxed">
            Are you a high roller on a competing crypto casino platform? If you're on a higher VIP level
            elsewhere, Goated.com offers an exciting opportunity for you to transfer your VIP status and
            enjoy great rewards! The "VIP Transfer" promotion is designed to help loyal players maximize
            their gaming experience by seamlessly transitioning to Goated's exclusive VIP program.
          </p>
        </div>

        <h3 className="font-heading text-3xl font-bold mb-6 text-[#D7FF00]">
          How Does the VIP Transfer Work?
        </h3>
        
        <div className="prose prose-invert max-w-none mb-12">
          <p className="text-lg leading-relaxed">
            If you're eligible for the VIP Transfer promotion, you'll need to meet certain wagering
            requirements at Goated.com within the first 30 days to qualify. The amount you wager on
            competing platforms determines the Goated VIP level you could unlock and the potential
            cash bonus for meeting the wagering requirement.
          </p>
        </div>

        {/* VIP Levels Table */}
        <div className="overflow-x-auto mb-12">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-heading text-[#D7FF00]">Amount Wagered on Competing Casino</TableHead>
                <TableHead className="font-heading text-[#D7FF00]">Wagering Requirement for Goated</TableHead>
                <TableHead className="font-heading text-[#D7FF00]">Approx. Cash Bonus</TableHead>
                <TableHead className="font-heading text-[#D7FF00]">Goated VIP Level Unlocked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vipLevels.map((level, index) => (
                <motion.tr
                  key={level.level}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-[#1A1B21]/50 backdrop-blur-sm"
                >
                  <TableCell className="font-sans">${level.wagered}</TableCell>
                  <TableCell className="font-sans">${level.requirement}</TableCell>
                  <TableCell className="font-sans">${level.bonus}</TableCell>
                  <TableCell className="font-sans">{level.level}</TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="bg-[#1A1B21]/50 backdrop-blur-sm p-4 rounded-lg mb-12">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-[#D7FF00] mt-1" />
            <div>
              <p className="text-sm text-gray-400">
                The cash bonus is calculated using the formula: "Cash Bonus = wager × (gameEdge / 0.04) × 0.015"
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Note: These cash bonus amounts assume you're playing games with a 1.5% house edge. Your actual
                bonus may vary depending on the games you choose.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="font-heading text-3xl font-bold text-[#D7FF00]">Important Details</h3>
          <ul className="list-disc list-inside space-y-2 text-lg">
            <li>This offer is only available to players whose accounts are less than 40 days old.</li>
            <li>
              You must meet the wagering requirement within the first 30 days of your account at
              Goated.com to qualify for the VIP transfer.
            </li>
          </ul>
        </div>
      </motion.div>

      {/* Footer */}
      <div className="bg-[#D7FF00] mt-20">
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h4 className="font-heading text-[#14151A] text-2xl font-bold mb-4">Ready to get Goated?</h4>
              <p className="text-[#14151A] mb-6">
                Sign up now and enjoy additional rewards from our side. Start your journey to becoming a casino legend!
              </p>
              <a 
                href="https://www.Goated.com/r/SPIN" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block bg-[#14151A] text-white px-6 py-3 rounded-lg font-heading font-bold hover:bg-opacity-90 transition-colors"
              >
                Sign Up Now
              </a>
            </div>
            <div>
              <h4 className="font-heading text-[#14151A] text-2xl font-bold mb-4">Stay Updated</h4>
              <p className="text-[#14151A] mb-4">Subscribe to our newsletter for exclusive offers and updates!</p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white text-[#14151A]"
                />
                <Button className="bg-[#14151A] text-white hover:bg-opacity-90">
                  Subscribe
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
