import { motion } from "framer-motion";
import { Bell, Clock, Copy, CheckCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface BonusCode {
  code: string;
  description: string;
  expiryDate: string;
  value: string;
  expired: boolean;
}

const bonusCodes: BonusCode[] = [
  {
    code: "WELCOME2024",
    description: "New Year welcome bonus - EXPIRED",
    expiryDate: "2024-01-15",
    value: "$10 Free Bonus",
    expired: true,
  },
  {
    code: "RELOAD5",
    description: "January reload bonus - EXPIRED",
    expiryDate: "2024-01-10",
    value: "$5 Free Bonus",
    expired: true,
  },
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
          <div className="mb-8">
            <video
              autoPlay
              muted
              playsInline
              className="mx-auto h-48 md:h-64 w-auto object-contain"
            >
              <source src="/images/Page Headers/BONUSHEAD.MP4" type="video/mp4" />
            </video>
          </div>
          <p className="text-xl text-[#8A8B91] max-w-2xl mx-auto mb-6">
            Keep an eye on this page for exclusive bonus codes. New codes are
            added regularly!
          </p>
          <div className="flex items-center justify-center gap-2 text-[#D7FF00]">
            <Bell className="h-5 w-5" />
            <p className="text-sm">
              Enable email notifications to get instant updates on new bonus
              codes
            </p>
          </div>
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
              <div
                className={`relative p-6 rounded-xl border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm ${bonus.expired ? "opacity-50" : "hover:border-[#D7FF00]/50"} transition-colors`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-heading text-white mb-2">
                      {bonus.code}
                    </h3>
                    <p className="text-[#8A8B91] mb-2">{bonus.description}</p>
                    <div className="flex items-center gap-2 text-sm text-[#8A8B91]">
                      <Clock className="h-4 w-4" />
                      <span>
                        {bonus.expired
                          ? "Expired"
                          : `Expires: ${new Date(bonus.expiryDate).toLocaleDateString()}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[#D7FF00] font-heading">
                      {bonus.value}
                    </span>
                    <Button
                      variant="outline"
                      className="relative group border-[#2A2B31] hover:border-[#D7FF00] hover:bg-[#D7FF00]/10"
                      onClick={() => copyToClipboard(bonus.code)}
                      disabled={bonus.expired}
                    >
                      {copiedCode === bonus.code ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2 text-[#D7FF00]" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          {bonus.expired ? "Expired" : "Copy Code"}
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
