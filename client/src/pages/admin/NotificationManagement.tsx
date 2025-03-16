
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function NotificationManagement() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const sendNotification = useMutation({
    mutationFn: async (data: { title: string; message: string }) => {
      const response = await fetch("/api/admin/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to send notification");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Notification sent successfully",
      });
      setTitle("");
      setMessage("");
    },
  });

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Notification Management</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Send Platform Notification</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => {
            e.preventDefault();
            sendNotification.mutate({ title, message });
          }}>
            <div className="space-y-4">
              <div>
                <Input
                  placeholder="Notification Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <Textarea
                  placeholder="Notification Message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                />
              </div>
              <Button 
                type="submit"
                disabled={sendNotification.isPending}
                className="w-full"
              >
                {sendNotification.isPending ? <LoadingSpinner /> : "Send Notification"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
