import { useState, useEffect, useRef } from "react";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: number;
  message: string;
  userId: number | null;
  createdAt: string;
  isStaffReply: boolean;
}

export function ChatInterface() {
  const { user } = useUser();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connectWebSocket = () => {
    try {
      setIsConnecting(true);
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const websocket = new WebSocket(
        `${protocol}//${window.location.host}/ws/chat`,
      );

      websocket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "error") {
          toast({
            title: "Error",
            description: message.message,
            variant: "destructive",
          });
          return;
        }
        setMessages((prev) => [...prev, message]);
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
      };

      websocket.onopen = () => {
        setIsConnecting(false);
        setWs(websocket);
      };

      websocket.onclose = () => {
        setIsConnecting(false);
        console.log("WebSocket connection closed");
        // Try to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      };

      websocket.onerror = (error) => {
        console.error("WebSocket error:", error);
        toast({
          title: "Connection Error",
          description: "Failed to connect to chat service. Retrying...",
          variant: "destructive",
        });
      };

      return websocket;
    } catch (error) {
      console.error("Error creating WebSocket:", error);
      setIsConnecting(false);
      return null;
    }
  };

  useEffect(() => {
    // Fetch chat history
    fetch("/api/chat/history", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setMessages(data);
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
      })
      .catch(console.error);

    // Connect to WebSocket
    const websocket = connectWebSocket();

    return () => {
      if (websocket) {
        websocket.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const sendMessage = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !newMessage.trim()) return;

    const message = {
      type: "chat_message",
      message: newMessage,
      userId: user?.id,
      isStaffReply: user?.isAdmin || false,
    };

    ws.send(JSON.stringify(message));
    setNewMessage("");
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const safeMessages = messages || [];


  return (
    <Card className="w-full max-w-4xl mx-auto bg-[#1A1B21] border-[#2A2B31]">
      <CardHeader className="border-b border-[#2A2B31] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-[#D7FF00] rounded-full animate-pulse" />
            <h3 className="font-heading text-lg text-white">VIP Support</h3>
          </div>
          {isConnecting && (
            <span className="text-sm text-[#8A8B91]">Connecting...</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px] px-6 py-4">
          <div className="space-y-4">
            {safeMessages.map((msg, idx) => (
              <div
                key={msg.id || idx}
                className={`flex gap-3 ${msg.userId === user?.id ? "justify-end" : ""}`}
              >
                {msg.userId !== user?.id && (
                  <Avatar className="h-8 w-8 bg-[#D7FF00]">
                    <Bot className="h-4 w-4 text-[#14151A]" />
                  </Avatar>
                )}
                <div
                  className={`flex-1 ${msg.userId === user?.id ? "text-right" : ""}`}
                >
                  <div
                    className={`inline-block rounded-lg p-4 ${
                      msg.userId === user?.id
                        ? "bg-[#D7FF00] text-[#14151A] ml-auto"
                        : "bg-[#2A2B31] text-white"
                    } max-w-[80%]`}
                  >
                    <p className="text-sm">{msg.message}</p>
                  </div>
                  <span className="text-xs text-[#8A8B91] mt-1 block">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
                {msg.userId === user?.id && (
                  <Avatar className="h-8 w-8 bg-[#2A2B31]">
                    <User className="h-4 w-4 text-white" />
                  </Avatar>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 bg-[#D7FF00]">
                  <Bot className="h-4 w-4 text-[#14151A]" />
                </Avatar>
                <div className="bg-[#2A2B31] rounded-lg p-3 inline-block">
                  <div className="flex gap-1">
                    <span
                      className="w-2 h-2 bg-[#8A8B91] rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-2 h-2 bg-[#8A8B91] rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-2 h-2 bg-[#8A8B91] rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="border-t border-[#2A2B31] p-4">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type your message..."
              className="flex-1 bg-[#2A2B31] border-none text-white placeholder:text-[#8A8B91]"
            />
            <Button
              onClick={sendMessage}
              size="icon"
              className="bg-[#D7FF00] hover:bg-[#D7FF00]/90 text-[#14151A]"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}