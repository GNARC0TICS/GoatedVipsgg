import { useState, useEffect, useRef } from "react";
import { useUser } from "@/hooks/use-user";
import { Message, Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";

interface Message {
  id: number;
  message: string;
  userId: number;
  createdAt: string;
  isStaffReply: boolean;
}

export function ChatInterface() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const websocket = new WebSocket(`ws://${window.location.host}/ws/chat`);
    
    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages((prev) => [...prev, message]);
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    websocket.onclose = () => {
      console.log("WebSocket connection closed");
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        setWs(new WebSocket(`ws://${window.location.host}/ws/chat`));
      }, 5000);
    };

    setWs(websocket);

    return () => {
      websocket.close();
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

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-4">
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={msg.id || idx}
                className={`flex ${msg.userId === user?.id ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.userId === user?.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{msg.message}</p>
                  <span className="text-xs opacity-70">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
        
        <div className="flex gap-2 mt-4">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type your message..."
            className="flex-1"
          />
          <Button onClick={sendMessage} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
