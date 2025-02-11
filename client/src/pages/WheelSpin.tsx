
import { PageTransition } from "@/components/PageTransition";
import { motion } from "framer-motion";
import { Gift } from "lucide-react";

export default function WheelSpin() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-[#1A1B21] text-white">
        <div className="container mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <Gift className="w-16 h-16 text-[#D7FF00] mx-auto mb-6" />
            <h1 className="text-4xl font-bold mb-6">Daily Wheel Spin</h1>
            <p className="text-[#8A8B91] mb-8">Spin the wheel daily for exclusive rewards and bonuses!</p>
            
            {/* Placeholder for wheel component */}
            <div className="max-w-md mx-auto bg-[#2A2B31]/50 rounded-xl p-8 backdrop-blur-sm border border-[#2A2B31]">
              <p className="text-[#D7FF00]">Wheel spin feature coming soon!</p>
            </div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
