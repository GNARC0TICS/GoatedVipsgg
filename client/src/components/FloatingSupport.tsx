import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";

interface FloatingSupportProps {
  onClose: () => void;
}

export function FloatingSupport({ onClose }: FloatingSupportProps) {
  const [isMinimized, setIsMinimized] = useState(true);
  const [hasUnreadMessage, setHasUnreadMessage] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [messages, setMessages] = useState<any[]>([]);

  const handleSendMessage = async () => {
    if (!replyText.trim()) return;

    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: replyText }),
      });

      if (response.ok) {
        setReplyText("");
        const newMessages = await fetch('/api/chat/messages').then(res => res.json());
        setMessages(newMessages);
      }
    } catch (err) {
      console.error('Error sending message:', err);
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
                  Support Chat
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
              <div className="space-y-3">
                <p className="text-[#8A8B91] mb-6">
                  Our support team is here to help you. Choose an option
                  below:
                </p>
                <div className="h-[300px] overflow-y-auto space-y-3 mb-4">
                  {messages.map((msg, i) => (
                    <div key={i} className="p-3 rounded-lg bg-[#2A2B31]/50">
                      <div className="text-white">{msg.message}</div>
                      <div className="text-sm text-[#8A8B91] mt-1">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button onClick={handleSendMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <Link href="/faq" className="block mt-4">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left hover:bg-[#2A2B31]/50"
                  >
                    📚 Browse FAQ
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