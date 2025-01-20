
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

export default function Telegram() {
  return (
    <div className="min-h-screen bg-[#14151A]">
      <main className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="mb-8">
            <MessageCircle className="h-16 w-16 text-[#D7FF00] mx-auto mb-4" />
            <h1 className="text-4xl font-heading text-white mb-4">Goombas x Goated VIPs</h1>
            <p className="text-[#8A8B91] text-lg mb-8">
              Join our exclusive Telegram community where VIP members share insights, strategies, and connect with fellow players. Be part of an engaging community that's passionate about gaming and success.
            </p>
          </div>

          <div className="bg-[#1A1B21]/50 border border-[#2A2B31] rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-heading text-white mb-4">What to Expect</h2>
            <ul className="text-[#8A8B91] text-left space-y-4">
              <li>• Exclusive gaming strategies and tips</li>
              <li>• Real-time updates on promotions and events</li>
              <li>• Direct interaction with community members</li>
              <li>• VIP-only announcements and opportunities</li>
            </ul>
          </div>

          <a 
            href="https://t.me/+iFlHl5V9VcszZTVh" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <Button className="bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90 font-heading text-lg px-8 py-6">
              Join Our Telegram Group
              <MessageCircle className="ml-2 h-5 w-5" />
            </Button>
          </a>
        </motion.div>
      </main>
    </div>
  );
}
