
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

interface VerificationBadgeProps {
  size?: 'sm' | 'md' | 'lg';
}

export function VerificationBadge({ size = 'md' }: VerificationBadgeProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <motion.div
      className="relative group cursor-pointer"
      whileHover={{ scale: 1.1 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        type: "spring",
        stiffness: 200,
        damping: 15
      }}
    >
      <motion.div
        className={`absolute inset-0 bg-[#D7FF00] blur-md opacity-50 ${sizes[size]}`}
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div 
        className={`relative ${sizes[size]} bg-gradient-to-r from-[#D7FF00] to-[#FFE500] rounded-full p-0.5`}
        style={{
          transform: "perspective(500px) rotateX(10deg)",
          boxShadow: "0 10px 30px -10px rgba(215, 255, 0, 0.5)"
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#D7FF00] to-[#FFE500] rounded-full opacity-50 blur-sm" />
        <CheckCircle className={`${sizes[size]} text-black`} />
      </motion.div>
      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-[#D7FF00] text-xs px-2 py-1 rounded whitespace-nowrap transition-opacity">
        Verified User
      </div>
    </motion.div>
  );
}
