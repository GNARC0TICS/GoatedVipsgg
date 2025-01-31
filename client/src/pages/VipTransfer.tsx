import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Info } from "lucide-react";

interface VipLevel {
  wagered: string;
  requirement: string;
  bonus: string;
  level: string;
}

const vipLevels: VipLevel[] = [
  { wagered: "100,000", requirement: "10,000", bonus: "55", level: "Gold 1" },
  {
    wagered: "450,000",
    requirement: "50,000",
    bonus: "280",
    level: "Platinum 1",
  },
  {
    wagered: "1,300,000",
    requirement: "120,000",
    bonus: "675",
    level: "Pearl 1",
  },
  {
    wagered: "3,000,000",
    requirement: "250,000",
    bonus: "1,400",
    level: "Sapphire 1",
  },
  {
    wagered: "7,000,000",
    requirement: "500,000",
    bonus: "2,800",
    level: "Emerald 1",
  },
  {
    wagered: "20,000,000",
    requirement: "1,000,000",
    bonus: "5,625",
    level: "Diamond 1",
  },
];

export default function VipTransfer() {
  return (
    <div className="min-h-screen bg-[#14151A] text-white">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto px-4 py-16"
      >
        <h1 className="header-text text-5xl mb-6 text-[#D7FF00]">
          GOATED.COM VIP TRANSFER PROMOTION:
        </h1>
        <h2 className="header-text text-4xl mb-8">
          UNLOCK HIGHER VIP LEVELS WITH EASE!
        </h2>

        <div className="prose prose-invert max-w-none mb-12">
          <p className="text-lg leading-relaxed font-sans">
            Are you a high roller on a competing crypto casino platform? If
            you&apos;re on a higher VIP level elsewhere, Goated.com offers an
            exciting opportunity for you to transfer your VIP status and enjoy
            great rewards! The &quot;VIP Transfer&quot; promotion is designed to help
            loyal players maximize their gaming experience by seamlessly
            transitioning to Goated&apos;s exclusive VIP program.
          </p>
        </div>

        <h3 className="header-text text-3xl mb-6 text-[#D7FF00]">
          HOW DOES THE VIP TRANSFER WORK?
        </h3>

        <div className="prose prose-invert max-w-none mb-12">
          <p className="text-lg leading-relaxed font-sans">
            If you&apos;re eligible for the VIP Transfer promotion, you&apos;ll need to
            meet certain wagering requirements at Goated.com within the first 30
            days to qualify. The amount you wager on competing platforms
            determines the Goated VIP level you could unlock and the potential
            cash bonus for meeting the wagering requirement.
          </p>
        </div>

        {/* VIP Levels Table */}
        <div className="overflow-x-auto mb-12">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="header-text text-[#D7FF00]">
                  AMOUNT WAGERED ON COMPETING CASINO
                </TableHead>
                <TableHead className="header-text text-[#D7FF00]">
                  WAGERING REQUIREMENT FOR GOATED
                </TableHead>
                <TableHead className="header-text text-[#D7FF00]">
                  APPROX. CASH BONUS
                </TableHead>
                <TableHead className="header-text text-[#D7FF00]">
                  GOATED VIP LEVEL UNLOCKED
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vipLevels.map((level) => (
                <motion.tr
                  key={level.level}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-[#1A1B21]/50 backdrop-blur-sm"
                >
                  <TableCell className="font-sans">${level.wagered}</TableCell>
                  <TableCell className="font-sans">
                    ${level.requirement}
                  </TableCell>
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
                The cash bonus is calculated using the formula: &quot;Cash Bonus =
                wager × (gameEdge / 0.04) × 0.015&quot;
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Note: These cash bonus amounts assume you&apos;re playing games with
                a 1.5% house edge. Your actual bonus may vary depending on the
                games you choose.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="font-heading text-3xl font-bold text-[#D7FF00]">
            Important Details
          </h3>
          <ul className="list-disc list-inside space-y-2 text-lg">
            <li>
              This offer is only available to players whose accounts are less
              than 40 days old.
            </li>
            <li>
              You must meet the wagering requirement within the first 30 days of
              your account at Goated.com to qualify for the VIP transfer.
            </li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}