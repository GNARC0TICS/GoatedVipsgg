import { motion } from "framer-motion";
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
  return (
    <div className="min-h-screen">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto px-4 py-16"
      >
        <h1 className="text-5xl font-bold mb-6 text-[#D7FF00]">
          GOATED.COM VIP TRANSFER PROMOTION:
        </h1>
        <h2 className="text-4xl mb-8">
          UNLOCK HIGHER VIP LEVELS WITH EASE!
        </h2>

        <div className="prose prose-invert max-w-none mb-12">
          <p className="text-lg leading-relaxed text-foreground">
            Are you a high roller on a competing crypto casino platform? If you're on a higher VIP level
            elsewhere, Goated.com offers an exciting opportunity for you to transfer your VIP status and
            enjoy great rewards! The "VIP Transfer" promotion is designed to help loyal players maximize
            their gaming experience by seamlessly transitioning to Goated's exclusive VIP program.
          </p>
        </div>

        <h3 className="text-3xl mb-6 text-[#D7FF00]">
          HOW DOES THE VIP TRANSFER WORK?
        </h3>

        <div className="prose prose-invert max-w-none mb-12">
          <p className="text-lg leading-relaxed text-foreground">
            If you're eligible for the VIP Transfer promotion, you'll need to meet certain wagering
            requirements at Goated.com within the first 30 days to qualify. The amount you wager on
            competing platforms determines the Goated VIP level you could unlock and the potential
            cash bonus for meeting the wagering requirement.
          </p>
        </div>

        <div className="overflow-x-auto mb-12">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[#D7FF00]">AMOUNT WAGERED ON COMPETING CASINO</TableHead>
                <TableHead className="text-[#D7FF00]">WAGERING REQUIREMENT FOR GOATED</TableHead>
                <TableHead className="text-[#D7FF00]">APPROX. CASH BONUS</TableHead>
                <TableHead className="text-[#D7FF00]">GOATED VIP LEVEL UNLOCKED</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vipLevels.map((level, index) => (
                <motion.tr
                  key={level.level}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <TableCell>${level.wagered}</TableCell>
                  <TableCell>${level.requirement}</TableCell>
                  <TableCell>${level.bonus}</TableCell>
                  <TableCell>{level.level}</TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="bg-card p-4 rounded-lg mb-12">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-[#D7FF00] mt-1" />
            <div>
              <p className="text-sm text-foreground">
                The cash bonus is calculated using the formula: "Cash Bonus = wager × (gameEdge / 0.04) × 0.015"
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Note: These cash bonus amounts assume you're playing games with a 1.5% house edge. Your actual
                bonus may vary depending on the games you choose.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-3xl font-bold text-[#D7FF00]">Important Details</h3>
          <ul className="list-disc list-inside space-y-2 text-lg text-foreground">
            <li>This offer is only available to players whose accounts are less than 40 days old.</li>
            <li>
              You must meet the wagering requirement within the first 30 days of your account at
              Goated.com to qualify for the VIP transfer.
            </li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}