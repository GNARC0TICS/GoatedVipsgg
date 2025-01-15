import { motion } from "framer-motion";
import { Clock, Copy, CheckCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface BonusCode {
  code: string;
  description: string;
  expiryDate: string;
  value: string;
}

const bonusCodes: BonusCode[] = [
  {
    code: "WELCOME2024",
    description: "New player welcome bonus",
    expiryDate: "2024-02-15",
    value: "100% up to $100"
  },
  {
    code: "GOATEDVIP",
    description: "VIP exclusive reload bonus",
    expiryDate: "2024-01-31",
    value: "50% up to $500"
  },
  {
    code: "WEEKEND50",
    description: "Weekend special bonus",
    expiryDate: "2024-01-20",
    value: "50% up to $200"
  }
];

export default function BonusCodes() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#14151A]">
      <main className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading text-white mb-6">
            BONUS CODES
          </h1>
          <p className="text-xl text-[#8A8B91] max-w-2xl mx-auto">
            Exclusive bonus codes to enhance your gaming experience. New codes added regularly!
          </p>
        </motion.div>

        <div className="grid gap-6">
          {bonusCodes.map((bonus, index) => (
            <motion.div
              key={bonus.code}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-[#D7FF00]/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative p-6 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm hover:border-[#D7FF00]/50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-heading text-white mb-2">{bonus.code}</h3>
                    <p className="text-[#8A8B91] mb-2">{bonus.description}</p>
                    <div className="flex items-center gap-2 text-sm text-[#8A8B91]">
                      <Clock className="h-4 w-4" />
                      <span>Expires: {new Date(bonus.expiryDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[#D7FF00] font-heading">{bonus.value}</span>
                    <Button
                      variant="outline"
                      className="relative group border-[#2A2B31] hover:border-[#D7FF00] hover:bg-[#D7FF00]/10"
                      onClick={() => copyToClipboard(bonus.code)}
                    >
                      {copiedCode === bonus.code ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2 text-[#D7FF00]" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Code
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
