import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Gift, Copy, Bell, CheckCircle } from "lucide-react";
import { useState } from "react";

export default function BonusCodes() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const bonusCodes = [
    {
      code: "WELCOME2024",
      description: "New Year welcome bonus - EXPIRED",
      expiresAt: "2024-01-15",
      value: "$10 Free Bonus",
      expired: true,
    },
    {
      code: "RELOAD5",
      description: "January reload bonus - EXPIRED",
      expiresAt: "2024-01-10",
      value: "$5 Free Bonus",
      expired: true,
    },
  ];

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#14151A]">
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-[#D7FF00] mb-8">
            BONUS CODES
          </h1>
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

        <div className="grid gap-6 md:grid-cols-2">
          {bonusCodes.map((bonus, index) => (
            <motion.div
              key={bonus.code}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31] hover:border-[#D7FF00]/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Gift className="h-5 w-5 text-[#D7FF00]" />
                        <h3 className="text-xl font-bold text-white">
                          {bonus.value}
                        </h3>
                      </div>
                      <p className="text-[#8A8B91] mb-4">{bonus.description}</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(bonus.code)}
                      className="shrink-0 border-[#2A2B31] hover:border-[#D7FF00] hover:bg-[#D7FF00]/10"
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

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#2A2B31]">
                    <code className="bg-[#2A2B31] px-2 py-1 rounded text-[#D7FF00] font-mono">
                      {bonus.code}
                    </code>
                    <span className="text-sm text-[#8A8B91]">
                      Expires: {new Date(bonus.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
