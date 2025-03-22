import { motion } from 'framer-motion';
import { useLocation } from 'wouter';

interface MobileNavLinkProps {
  href: string;
  label: string | React.ReactNode;
  onClose: () => void;
  isTitle?: boolean;
}

export function MobileNavLink({
  href,
  label,
  onClose,
  isTitle = false,
}: MobileNavLinkProps) {
  const [location] = useLocation();
  const isActive = location === href;
  const isHome = href === "/";

  return (
    <motion.div
      whileHover={{ x: 8 }}
      whileTap={{ scale: 0.98 }}
      onClick={(e) => {
        e.preventDefault();
        onClose();
        window.location.href = href;
      }}
      className={`px-4 py-2.5 rounded-lg transition-all duration-200 cursor-pointer ${
        isActive
          ? "bg-[#D7FF00]/10 text-[#D7FF00]"
          : "text-white hover:bg-[#2A2B31]"
      } ${isTitle || isHome ? "text-base font-bold" : "text-sm"}`}
    >
      {label}
    </motion.div>
  );
}
