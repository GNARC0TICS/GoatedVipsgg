import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

export default function Community() {
  return (
    <div className="min-h-screen bg-[#14151A]">
      <main className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="mb-8">
            <img
              src="/images/Goated Logo - Yellow.png"
              alt="Goated Logo"
              className="h-20 w-32 mx-auto mb-4 object-contain"
            />
            <h1 className="text-4xl font-heading text-white mb-4">
              Join Our Community
            </h1>
            <p className="text-[#8A8B91] text-lg mb-8">
              Connect with fellow players, share insights, and stay updated with
              the latest gaming strategies and events. Join our community channels
              to be part of the conversation.
            </p>
          </div>

          <div className="bg-[#1A1B21]/50 border border-[#2A2B31] rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-heading text-white mb-4">
              Community Benefits
            </h2>
            <ul className="text-[#8A8B91] text-left space-y-4">
              <li>• Access to exclusive gaming strategies</li>
              <li>• Real-time updates on promotions</li>
              <li>• Connect with experienced players</li>
              <li>• Early access to new features</li>
              <li>• Special community events</li>
              <li>• Regular giveaways and contests</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://t.me/+bnV67QwFmCFlMGFh"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="w-full sm:w-auto bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90 font-heading text-lg px-8 py-6">
                Join Telegram
                <MessageCircle className="ml-2 h-5 w-5" />
              </Button>
            </a>

            <a
              href="https://twitter.com/Goatedcom"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="w-full sm:w-auto bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90 font-heading text-lg px-8 py-6">
                Follow Twitter
                <MessageCircle className="ml-2 h-5 w-5" />
              </Button>
            </a>
          </div>
        </motion.div>
      </main>
    </div>
  );
}