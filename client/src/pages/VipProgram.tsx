
import { motion } from "framer-motion";

const tiers = [
  { name: "COPPER", icon: "/images/Goated Emblems/copper.548d79cf.svg" },
  { name: "BRONZE", icon: "/images/Goated Emblems/bronze.e6ea941b.svg" },
  { name: "SILVER", icon: "/images/Goated Emblems/silver.8e3ec67f.svg" },
  { name: "GOLD", icon: "/images/Goated Emblems/gold.1c810178.svg" },
  { name: "PLATINUM", icon: "/images/Goated Emblems/platinum.d258f583.svg" },
  { name: "PEARL", icon: "/images/Goated Emblems/pearl.1815809f.svg" },
  { name: "SAPPHIRE", icon: "/images/Goated Emblems/sapphire.91e6756b.svg" },
  { name: "EMERALD", icon: "/images/Goated Emblems/emerald.46bd38eb.svg" }
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
  { name: "Goated Event Invitations", startingTier: "EMERALD" }
];

export default function VipProgram() {
  return (
    <div className="min-h-screen bg-[#14151A] text-white">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto px-4 py-16"
      >
        <h1 className="text-5xl font-bold mb-6 text-[#D7FF00]">
          EARN REWARDS WITH GOATED VIP PROGRAM
        </h1>
        
        <p className="text-lg mb-12">
          Goated's VIP program is tailored to accommodate all types of players, with a focus on 
          maximizing the cumulative bonuses you receive for every dollar wagered.
        </p>

        {/* VIP Tiers Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {tiers.map((tier) => (
            <div 
              key={tier.name}
              className="bg-[#1A1B21]/50 backdrop-blur-sm p-6 rounded-xl border border-[#2A2B31] hover:border-[#D7FF00]/50 transition-all"
            >
              <img 
                src={tier.icon} 
                alt={`${tier.name} tier`} 
                className="w-24 h-24 mx-auto mb-4"
              />
              <h3 className="text-center text-xl font-bold">{tier.name}</h3>
            </div>
          ))}
        </div>

        {/* Benefits Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#2A2B31]">
                <th className="py-4 text-left text-[#D7FF00]">REWARD</th>
                {tiers.map((tier) => (
                  <th key={tier.name} className="py-4 text-center">
                    <img 
                      src={tier.icon} 
                      alt={tier.name} 
                      className="w-8 h-8 mx-auto mb-2"
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
                    const tierIndex = tiers.findIndex(t => t.name === tier.name);
                    const benefitStartIndex = tiers.findIndex(t => t.name === benefit.startingTier);
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
