import { ChatInterface } from "@/components/chat/ChatInterface";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export default function SupportPage() {
  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Support Chat</CardTitle>
        </CardHeader>
        <ChatInterface />
      </Card>
    </div>
  );
}
