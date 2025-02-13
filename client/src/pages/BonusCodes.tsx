import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Gift, Copy, Bell, CheckCircle, ArrowLeft, Webhook } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

interface BonusCode {
  id: string;
  code: string;
  description: string;
  bonusAmount: string;
  requiredWager: string;
  expiresAt: string;
  status: string;
  source: string;
  currentClaims: number;
  totalClaims: number;
}

export default function BonusCodes() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: bonusCodes, isLoading } = useQuery<BonusCode[]>({
    queryKey: ["bonus-codes"],
    queryFn: async () => {
      const response = await fetch("/api/bonus-codes");
      if (!response.ok) throw new Error("Failed to fetch bonus codes");
      return response.json();
    },
  });

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();
  const isFull = (current: number, total: number) => current >= total;

  return (
    <div className="min-h-screen bg-[#14151A]">
      <div className="container mx-auto px-4 py-8">
        <Link href="/">
          <Button variant="ghost" className="mb-8 hover:bg-[#1A1B21]/50">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="mb-8">
            <video
              autoPlay
              muted
              playsInline
              loop
              className="w-full h-48 md:h-64 object-contain rounded-xl"
            >
              <source src="/images/Page Headers/BONUSHEAD.MP4" type="video/mp4" />
            </video>
          </div>

          <p className="text-xl text-[#8A8B91] max-w-2xl mx-auto mb-6 text-center">
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
          {isLoading ? (
            <div className="text-center col-span-2 py-4">Loading bonus codes...</div>
          ) : bonusCodes?.map((bonus, index) => {
            const expired = isExpired(bonus.expiresAt);
            const full = isFull(bonus.currentClaims, bonus.totalClaims);
            const disabled = expired || full;

            return (
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
                            {bonus.bonusAmount}
                          </h3>
                          <Badge variant={bonus.source === 'telegram' ? 'secondary' : 'default'}>
                            {bonus.source === 'telegram' && <Webhook className="h-3 w-3 mr-1" />}
                            {bonus.source}
                          </Badge>
                        </div>
                        <p className="text-[#8A8B91] mb-1">{bonus.description}</p>
                        <p className="text-sm text-[#8A8B91]">
                          Claims: {bonus.currentClaims}/{bonus.totalClaims} •
                          {expired ? " Expired" : ` Expires: ${new Date(bonus.expiresAt).toLocaleDateString()}`}
                        </p>
                        {bonus.requiredWager && (
                          <p className="text-sm text-[#D7FF00] mt-1">
                            Required Wager: {bonus.requiredWager}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => copyToClipboard(bonus.code)}
                        className="shrink-0 border-[#2A2B31] hover:border-[#D7FF00] hover:bg-[#D7FF00]/10"
                        disabled={disabled}
                      >
                        {copiedCode === bonus.code ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2 text-[#D7FF00]" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            {expired ? "Expired" : full ? "Full" : "Copy Code"}
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}