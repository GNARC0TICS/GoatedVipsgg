
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Mail, Trophy, Crown, CheckCircle } from "lucide-react";
import type { SelectNotificationPreferences } from "@db/schema";

export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState<SelectNotificationPreferences | null>(null);

  // Fetch current preferences
  const { data, isLoading } = useQuery<SelectNotificationPreferences>({
    queryKey: ["/api/notification-preferences"],
    onSuccess: (data) => {
      setPreferences(data);
    },
  });

  // Update preferences mutation
  const updatePreferences = useMutation({
    mutationFn: async (newPreferences: Partial<SelectNotificationPreferences>) => {
      const response = await fetch("/api/notification-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPreferences),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Your notification preferences have been saved.",
        variant: "success",
        duration: 3000,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update preferences",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const togglePreference = (key: keyof SelectNotificationPreferences) => {
    const newPreferences = {
      ...preferences,
      [key]: !preferences?.[key],
    };
    setPreferences(newPreferences);
    updatePreferences.mutate({ [key]: !preferences?.[key] });
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const notificationTypes = [
    {
      id: "emailNotifications",
      title: "Email Notifications",
      description: "Receive important updates via email",
      icon: Mail,
    },
    {
      id: "wagerRaceAlerts",
      title: "Wager Race Alerts",
      description: "Get notified about race starts and results",
      icon: Trophy,
    },
    {
      id: "vipUpdates",
      title: "VIP Status Updates",
      description: "Updates about your VIP level and benefits",
      icon: Crown,
    },
    {
      id: "systemNotifications",
      title: "System Notifications",
      description: "Important system announcements",
      icon: Bell,
    },
  ];

  return (
    <div className="container mx-auto max-w-4xl space-y-8 p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Notification Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Customize how you want to receive updates and alerts
        </p>
      </div>

      <div className="grid gap-6">
        {notificationTypes.map(({ id, title, description, icon: Icon }) => (
          <Card key={id} className="overflow-hidden transition-all hover:shadow-lg">
            <CardHeader className="border-b bg-muted/50 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{title}</CardTitle>
                </div>
                <Switch
                  id={id}
                  checked={preferences?.[id as keyof SelectNotificationPreferences] || false}
                  onCheckedChange={() => togglePreference(id as keyof SelectNotificationPreferences)}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <CardDescription className="text-sm">{description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button 
          variant="outline" 
          className="group relative"
          onClick={() => {
            toast({
              title: "Settings Saved",
              description: "Your preferences are up to date",
              variant: "success",
            });
          }}
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Save Preferences
          <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-primary transition-all group-hover:w-full"></span>
        </Button>
      </div>
    </div>
  );
}
