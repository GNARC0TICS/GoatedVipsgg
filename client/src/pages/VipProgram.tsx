import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface TierLevel {
  level: string;
  xpRequired: string;
}

const tiers = [
  {
    name: "COPPER",
    icon: "/images/Goated Emblems/copper.548d79cf.svg",
    levels: [{ level: "Copper 1", xpRequired: "0" }],
  },
  {
    name: "BRONZE",
    icon: "/images/Goated Emblems/bronze.e6ea941b.svg",
    levels: [
      { level: "Bronze 1", xpRequired: "1,000" },
      { level: "Bronze 2", xpRequired: "2,000" },
      { level: "Bronze 3", xpRequired: "3,000" },
      { level: "Bronze 4", xpRequired: "4,000" },
    ],
  },
  {
    name: "SILVER",
    icon: "/images/Goated Emblems/silver.8e3ec67f.svg",
    levels: [
      { level: "Silver 1", xpRequired: "10,000" },
      { level: "Silver 2", xpRequired: "20,000" },
      { level: "Silver 3", xpRequired: "30,000" },
      { level: "Silver 4", xpRequired: "40,000" },
    ],
  },
  {
    name: "GOLD",
    icon: "/images/Goated Emblems/gold.1c810178.svg",
    levels: [
      { level: "Gold 1", xpRequired: "100,000" },
      { level: "Gold 2", xpRequired: "150,000" },
      { level: "Gold 3", xpRequired: "200,000" },
      { level: "Gold 4", xpRequired: "250,000" },
    ],
  },
  {
    name: "PLATINUM",
    icon: "/images/Goated Emblems/platinum.d258f583.svg",
    levels: [
      { level: "Platinum 1", xpRequired: "450,000" },
      { level: "Platinum 2", xpRequired: "600,000" },
      { level: "Platinum 3", xpRequired: "750,000" },
      { level: "Platinum 4", xpRequired: "900,000" },
    ],
  },
  {
    name: "PEARL",
    icon: "/images/Goated Emblems/pearl.1815809f.svg",
    levels: [
      { level: "Pearl 1", xpRequired: "1,500,000" },
      { level: "Pearl 2", xpRequired: "1,650,000" },
      { level: "Pearl 3", xpRequired: "1,800,000" },
      { level: "Pearl 4", xpRequired: "2,000,000" },
    ],
  },
  {
    name: "SAPPHIRE",
    icon: "/images/Goated Emblems/sapphire.91e6756b.svg",
    levels: [
      { level: "Sapphire 1", xpRequired: "3,000,000" },
      { level: "Sapphire 2", xpRequired: "3,750,000" },
      { level: "Sapphire 3", xpRequired: "4,500,000" },
      { level: "Sapphire 4", xpRequired: "5,250,000" },
    ],
  },
  {
    name: "EMERALD",
    icon: "/images/Goated Emblems/emerald.46bd38eb.svg",
    levels: [
      { level: "Emerald 1", xpRequired: "7,000,000" },
      { level: "Emerald 2", xpRequired: "9,000,000" },
      { level: "Emerald 3", xpRequired: "11,000,000" },
      { level: "Emerald 4", xpRequired: "13,000,000" },
    ],
  },
  {
    name: "DIAMOND",
    icon: "/images/Goated Emblems/diamond.ddf47a1e.svg",
    levels: [
      { level: "Diamond 1", xpRequired: "20,000,000" },
      { level: "Diamond 2", xpRequired: "25,000,000" },
      { level: "Diamond 3", xpRequired: "30,000,000" },
      { level: "Diamond 4", xpRequired: "35,000,000" },
    ],
  },
];

const benefits = [
  { name: "Instant Rakeback", startingTier: "BRONZE" },
  { name: "Level Up Bonus", startingTier: "BRONZE" },
  { name: "Weekly Bonus", startingTier: "BRONZE" },
  { name: "Monthly Bonus", startingTier: "SILVER" },
  { name: "Bonus Increase", startingTier: "SILVER" },
  { name: "Referral Increase", startingTier: "GOLD" },
  { name: "Loss Back Bonus", startingTier: "GOLD" },
  { name: "VIP Host", startingTier: "PEARL" },
  { name: "Goated Event Invitations", startingTier: "EMERALD" },
];

export default function VipProgram() {
  const [expandedTier, setExpandedTier] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#14151A] text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto px-4 py-16"
      >
        <div className="mb-8">
          <video
            autoPlay
            muted
            playsInline
            className="mx-auto h-48 md:h-64 w-auto object-contain"
          >
            <source src="/images/Page Headers/VIPHEAD.MP4" type="video/mp4" />
          </video>
        </div>

        <button
          onClick={() => (window.location.href = "/")}
          className="mb-8 px-4 py-2 flex items-center gap-2 text-white hover:text-[#D7FF00] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </button>

        <h2 className="text-4xl font-bold mb-6 text-[#D7FF00]">
          EARN REWARDS WITH GOATED VIP PROGRAM
        </h2>

        <p className="text-lg mb-12">
          Goated's VIP program is tailored to accommodate all types of players,
          with a focus on maximizing the cumulative bonuses you receive for
          every dollar wagered.
        </p>

        {/* VIP Levels */}
        <div className="space-y-4 mb-16">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="bg-[#1A1B21]/50 backdrop-blur-sm rounded-xl border border-[#2A2B31]"
            >
              <button
                onClick={() =>
                  setExpandedTier(expandedTier === tier.name ? null : tier.name)
                }
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#2A2B31]/20 transition-colors rounded-xl"
              >
                <div className="flex items-center gap-4">
                  <img src={tier.icon} alt={tier.name} className="w-8 h-8" />
                  <span className="text-xl font-bold">{tier.name}</span>
                </div>
                <ChevronDown
                  className={`w-6 h-6 transition-transform ${expandedTier === tier.name ? "rotate-180" : ""}`}
                />
              </button>

              {expandedTier === tier.name && (
                <div className="px-6 pb-4">
                  <div className="grid grid-cols-2 gap-8 text-sm uppercase tracking-wider text-[#D7FF00] mb-2">
                    <div>Level</div>
                    <div>XP Required</div>
                  </div>
                  {tier.levels.map((level: TierLevel) => (
                    <div
                      key={level.level}
                      className="grid grid-cols-2 gap-8 py-3 border-t border-[#2A2B31] hover:bg-[#2A2B31]/10 transition-colors"
                    >
                      <div className="font-medium">{level.level}</div>
                      <div className="text-[#8A8B91]">
                        {level.xpRequired} XP
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Benefits Table */}
        <h2 className="text-3xl font-bold mb-6 text-[#D7FF00]">Benefits</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#2A2B31]">
                <th className="py-4 text-left">REWARD</th>
                {tiers.map((tier) => (
                  <th key={tier.name} className="py-4 text-center">
                    <img
                      src={tier.icon}
                      alt={tier.name}
                      className="w-6 h-6 mx-auto mb-2"
                    />
                    {tier.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {benefits.map((benefit) => (
                <tr key={benefit.name} className="border-b border-[#2A2B31]">
                  <td className="py-4">{benefit.name}</td>
                  {tiers.map((tier) => {
                    const tierIndex = tiers.findIndex(
                      (t) => t.name === tier.name,
                    );
                    const benefitStartIndex = tiers.findIndex(
                      (t) => t.name === benefit.startingTier,
                    );
                    return (
                      <td key={tier.name} className="text-center py-4">
                        {tierIndex >= benefitStartIndex ? (
                          <span className="text-[#D7FF00]">✓</span>
                        ) : (
                          <span className="text-gray-500">✗</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
