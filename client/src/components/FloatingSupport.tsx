import { useState, useEffect } from 'react';
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
  const [showInitialMessage, setShowInitialMessage] = useState(false);

  useEffect(() => {
    // Show welcome message after a short delay
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
              className="h-12 w-12 rounded-full bg-[#D7FF00] hover:bg-[#D7FF00]/90 text-[#14151A] shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
            
            {showInitialMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute bottom-full right-0 mb-2"
              >
                <Card className="p-4 w-64 bg-[#1A1B21] border-[#2A2B31] shadow-lg">
                  <p className="text-sm text-white mb-3">
                    👋 Need help? Our support team is here for you!
                  </p>
                  <div className="flex justify-between items-center">
                    <Button
                      variant="link"
                      className="text-[#D7FF00] hover:text-[#D7FF00]/80 p-0 h-auto"
                      onClick={() => {
                        setIsMinimized(false);
                        setShowInitialMessage(false);
                      }}
                    >
                      Get Help
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setShowInitialMessage(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </div>
        ) : (
          <Card className="w-[350px] bg-[#1A1B21] border-[#2A2B31]">
            <div className="p-4 border-b border-[#2A2B31] flex justify-between items-center">
              <h3 className="font-heading text-lg text-white">Support</h3>
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
            <div className="p-4 space-y-4">
              <p className="text-[#8A8B91]">
                Welcome to Goated Support! How can we assist you today?
              </p>
              <div className="space-y-2">
                <Link href="/support" className="block">
                  <Button
                    variant="secondary"
                    className="w-full justify-start text-left"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Chat with Support
                  </Button>
                </Link>
                <Link href="/help" className="block">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left"
                  >
                    📚 View Help Center
                  </Button>
                </Link>
                <Link href="/faq" className="block">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left"
                  >
                    ❓ FAQ
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
