import { motion } from 'framer-motion';
import { Link, useLocation } from 'wouter';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NavLinkProps {
  href: string;
  label: string | React.ReactNode;
  tooltip?: string;
}

export function NavLink({ href, label, tooltip }: NavLinkProps) {
  const [location] = useLocation();
  const isActive = location === href;

  const linkContent = (
    <motion.div
      className={`relative font-heading cursor-pointer ${
        isActive ? "text-[#D7FF00]" : "text-white"
      } hover:text-[#D7FF00] transition-all duration-300`}
      whileHover={{ x: 5 }}
      whileTap={{ scale: 0.95 }}
    >
      {label}
      <motion.div
        className="absolute -bottom-1 left-0 h-0.5 bg-[#D7FF00] origin-left"
        initial={{ scaleX: isActive ? 1 : 0 }}
        animate={{ scaleX: isActive ? 1 : 0 }}
        whileHover={{ scaleX: 1 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );

  return tooltip ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={href}>{linkContent}</Link>
        </TooltipTrigger>
        <TooltipContent className="bg-[#1A1B21] border-[#2A2B31] text-white">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    <Link href={href}>{linkContent}</Link>
  );
}
