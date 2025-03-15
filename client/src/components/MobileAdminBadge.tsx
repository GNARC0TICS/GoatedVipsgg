import React from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Wrench } from "lucide-react";

export const MobileAdminBadge: React.FC = () => {
  return (
    <Link href="/admin/dashboard">
      <motion.div
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-20 right-4 z-50 bg-[#D7FF00] text-black rounded-full p-3 shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Wrench className="h-6 w-6" />
      </motion.div>
    </Link>
  );
};
