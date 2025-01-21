import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Gift, Copy } from "lucide-react";

export default function BonusCodes() {
  const bonusCodes = [
    {
      code: "WELCOME2024",
      description: "Welcome bonus for new users",
      value: "100% up to $100",
      expiresAt: "2024-02-01"
    },
    {
      code: "RELOAD50",
      description: "Reload bonus for existing users",
      value: "50% up to $50",
      expiresAt: "2024-01-31"
    }
  ];

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="min-h-screen bg-[#14151A]">
      <div className="container mx-auto px-4 py-16">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-heading font-bold text-[#D7FF00] mb-8"
        >
          BONUS CODES
        </motion.h1>

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
                        <h3 className="text-xl font-bold text-white">{bonus.value}</h3>
                      </div>
                      <p className="text-[#8A8B91] mb-4">{bonus.description}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(bonus.code)}
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4" />
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