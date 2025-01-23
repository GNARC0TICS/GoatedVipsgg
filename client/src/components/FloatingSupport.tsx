import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from 'wouter';

interface FloatingSupportProps {
  onClose: () => void;
}

export function FloatingSupport({ onClose }: FloatingSupportProps) {
  const [isMinimized, setIsMinimized] = useState(true);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-20 right-4 z-50"
      >
        {isMinimized ? (
          <div className="relative">
            <Button
              onClick={() => setIsMinimized(false)}
              size="icon"
              className="h-14 w-14 rounded-full bg-[#D7FF00] hover:bg-[#D7FF00]/90 text-[#14151A] shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <MessageCircle className="h-7 w-7" />
            </Button>
          </div>
        ) : (
          <Card className="w-[400px] bg-[#1A1B21] border-[#2A2B31]">
            <div className="p-4 border-b border-[#2A2B31] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 bg-[#D7FF00] rounded-full animate-pulse" />
                <h3 className="font-heading text-lg text-white">Need Help?</h3>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsMinimized(true)}
                >
                  <span className="sr-only">Minimize</span>
                  <span className="h-1 w-4 bg-current rounded-full" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <Link href="/support" className="block">
                  <Button
                    variant="secondary"
                    className="w-full justify-start text-left hover:bg-[#D7FF00] hover:text-black transition-colors"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Live Chat with VIP Support
                  </Button>
                </Link>
                <Link href="/faq" className="block">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left hover:bg-[#2A2B31]/50"
                  >
                    📚 Browse FAQ
                  </Button>
                </Link>
                <a
                  href="https://t.me/xGoombas"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left hover:bg-[#2A2B31]/50"
                  >
                    💬 Contact on Telegram
                  </Button>
                </a>
                <Link href="/telegram" className="block">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left hover:bg-[#2A2B31]/50"
                  >
                    👥 Join Our Community
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        )}
      </motion.div>
    </AnimatePresence>
  );
}