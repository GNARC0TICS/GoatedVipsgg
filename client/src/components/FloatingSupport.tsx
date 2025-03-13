
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import type { SelectUser } from "@db/schema";

interface FloatingSupportProps {
  onClose: () => void;
}

export function FloatingSupport({ onClose }: FloatingSupportProps) {
  const [isMinimized, setIsMinimized] = useState(true);
  const [hasUnreadMessage, setHasUnreadMessage] = useState(true);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");

  // Get current user to check if admin
  const { data: user } = useQuery<SelectUser>({
    queryKey: ["/api/user"],
  });

  // Fetch support messages (implement API endpoint)
  useEffect(() => {
    if (user?.isAdmin && !isMinimized) {
      fetch('/api/support/messages')
        .then(res => res.json())
        .then(data => setSupportMessages(data))
        .catch(err => console.error('Error fetching support messages:', err));
    }
  }, [user?.isAdmin, isMinimized]);

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    
    try {
      await fetch('/api/support/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: replyText }),
      });
      setReplyText("");
      // Refresh messages
      const res = await fetch('/api/support/messages');
      const data = await res.json();
      setSupportMessages(data);
    } catch (err) {
      console.error('Error sending reply:', err);
    }
  };

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
              onClick={() => {
                setIsMinimized(false);
                setHasUnreadMessage(false);
              }}
              size="icon"
              className="h-14 w-14 rounded-full bg-[#D7FF00] hover:bg-[#D7FF00]/90 text-[#14151A] shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <MessageCircle className="h-7 w-7" />
              {hasUnreadMessage && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full border-2 border-background animate-pulse" />
              )}
            </Button>
          </div>
        ) : (
          <Card className="w-[400px] bg-[#1A1B21] border-[#2A2B31]">
            <div className="p-4 border-b border-[#2A2B31] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 bg-[#D7FF00] rounded-full animate-pulse" />
                <h3 className="font-heading text-lg text-white">
                  {user?.isAdmin ? 'Support Dashboard' : 'VIP Support'}
                </h3>
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
              {user?.isAdmin ? (
                // Admin Interface
                <div className="space-y-4">
                  <div className="h-[300px] overflow-y-auto space-y-3 mb-4">
                    {supportMessages.map((msg, i) => (
                      <div key={i} className="p-3 rounded-lg bg-[#2A2B31]/50">
                        <div className="text-sm text-[#8A8B91]">{msg.username}</div>
                        <div className="text-white">{msg.message}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply..."
                      className="flex-1"
                    />
                    <Button onClick={handleSendReply}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                // User Interface
                <div className="space-y-3">
                  <p className="text-[#8A8B91] mb-6">
                    Our VIP support team is here to help you. Choose an option
                    below:
                  </p>
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
                      👥 Join Telegram Community
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </Card>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
