import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from 'wouter';

interface FloatingSupportProps {
  onClose: () => void;
}

export function FloatingSupport({ onClose }: FloatingSupportProps) {
  const [isMinimized, setIsMinimized] = useState(true);
  const [showInitialMessage, setShowInitialMessage] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowInitialMessage(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-4 right-4 z-50"
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

            {showInitialMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute bottom-full right-0 mb-4"
              >
                <Card className="p-6 w-72 bg-[#1A1B21] border-[#2A2B31] shadow-lg">
                  <div className="flex items-start justify-between mb-3">
                    <span className="font-bold text-[#D7FF00]">VIP Support</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setShowInitialMessage(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-white mb-4">
                    Welcome to VIP Support! How can we assist you today?
                  </p>
                  <div className="flex justify-end">
                    <Button
                      variant="link"
                      className="text-[#D7FF00] hover:text-[#D7FF00]/80 p-0 h-auto"
                      onClick={() => {
                        setIsMinimized(false);
                        setShowInitialMessage(false);
                      }}
                    >
                      Get Assistance <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </div>
        ) : (
          <Card className="w-[400px] bg-[#1A1B21] border-[#2A2B31]">
            <div className="p-4 border-b border-[#2A2B31] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 bg-[#D7FF00] rounded-full animate-pulse" />
                <h3 className="font-heading text-lg text-white">VIP Support</h3>
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
              <p className="text-[#8A8B91] mb-6">
                Our VIP support team is here to help you. Choose an option below:
              </p>
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
                <a
                  href="https://t.me/goated_group"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left hover:bg-[#2A2B31]/50"
                  >
                    👥 Join Telegram Community
                  </Button>
                </a>
              </div>
            </div>
          </Card>
        )}
      </motion.div>
    </AnimatePresence>
  );
}