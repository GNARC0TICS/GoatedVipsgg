import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import type { SelectUser } from "@db/schema";

interface FloatingSupportProps {
  onClose: () => void;
}

interface SupportMessage {
  username: string;
  message: string;
}

export function FloatingSupport({ onClose }: FloatingSupportProps) {
  const [isMinimized, setIsMinimized] = useState(true);
  const [hasUnreadMessage, setHasUnreadMessage] = useState(true);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Get current user to check if admin
  const { data: user } = useQuery<SelectUser>({
    queryKey: ["/api/user"],
  });

  // Fetch support messages when component is opened
  useEffect(() => {
    const fetchMessages = async () => {
      if (user?.isAdmin && !isMinimized) {
        setLoadingMessages(true);
        try {
          const res = await fetch('/api/support/messages');
          const data = await res.json();
          setSupportMessages(data);
        } catch (err) {
          console.error('Error fetching support messages:', err);
        } finally {
          setLoadingMessages(false);
        }
      }
    };

    fetchMessages();
    
    // Auto-focus input when opening
    if (!isMinimized && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [user?.isAdmin, isMinimized]);

  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [supportMessages]);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-20 left-4 z-50"
      >
        {isMinimized ? (
          <div className="relative">
            <Button
              onClick={() => {
                setIsMinimized(false);
                setHasUnreadMessage(false);
              }}
              size="icon"
              className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-background shadow-lg transition-all duration-300"
            >
              <MessageCircle className="h-7 w-7" />
              {hasUnreadMessage && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full border-2 border-background animate-pulse" />
              )}
            </Button>
          </div>
        ) : (
          <Card className="w-[350px] sm:w-[400px] bg-card border border-border shadow-xl overflow-hidden">
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                <h3 className="font-heading text-lg">
                  {user?.isAdmin ? "Support Dashboard" : "VIP Support"}
                </h3>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-muted"
                  onClick={() => setIsMinimized(true)}
                  aria-label="Minimize"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-muted"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {user?.isAdmin ? (
                // Admin Interface
                <div className="space-y-4">
                  <div 
                    ref={messagesContainerRef} 
                    className="h-[300px] overflow-y-auto space-y-3 mb-4 pr-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
                  >
                    {loadingMessages ? (
                      <div className="flex justify-center items-center h-full">
                        <div className="animate-pulse text-muted-foreground">Loading messages...</div>
                      </div>
                    ) : supportMessages.length > 0 ? (
                      supportMessages.map((msg, i) => (
                        <div key={i} className="p-3 rounded-lg bg-muted/50">
                          <div className="text-sm text-muted-foreground">{msg.username}</div>
                          <div>{msg.message}</div>
                        </div>
                      ))
                    ) : (
                      <div className="flex justify-center items-center h-full">
                        <div className="text-muted-foreground">No messages yet</div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your reply..."
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleSendReply} 
                      disabled={!replyText.trim()}
                      size="icon"
                      aria-label="Send"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                // User Interface
                <div className="space-y-3">
                  <p className="text-muted-foreground mb-6">
                    Our VIP support team is here to help you. Choose an option below:
                  </p>
                  <Link href="/support">
                    <Button variant="default" className="w-full justify-start text-left">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Live Chat with VIP Support
                    </Button>
                  </Link>
                  <Link href="/faq">
                    <Button variant="secondary" className="w-full justify-start text-left">
                      📚 Browse FAQ
                    </Button>
                  </Link>
                  <a href="https://t.me/xGoombas" target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" className="w-full justify-start text-left">
                      💬 Contact on Telegram
                    </Button>
                  </a>
                  <Link href="/telegram">
                    <Button variant="ghost" className="w-full justify-start text-left hover:bg-muted">
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