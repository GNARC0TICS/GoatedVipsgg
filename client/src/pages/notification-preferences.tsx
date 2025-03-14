import React from "react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Bell, Mail, Trophy, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type SelectNotificationPreferences } from "@db/schema";

interface NotificationPreferencesResponse {
  preferences: SelectNotificationPreferences;
}

export default function NotificationPreferences() {
  const { toast } = useToast();
  const [preferences, setPreferences] =
    useState<SelectNotificationPreferences | null>(null);

  // Fetch current preferences
  const { data, isLoading } = useQuery<NotificationPreferencesResponse>({
    queryKey: ["/api/notification-preferences"],
    queryFn: async () => {
      const response = await fetch("/api/notification-preferences", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch preferences");
      }
      const data = await response.json();
      setPreferences(data.preferences);
      return data;
    },
  });

  // Update preferences mutation
  const updatePreferences = useMutation({
    mutationFn: async (
      newPreferences: Partial<SelectNotificationPreferences>,
    ) => {
      const response = await fetch("/api/notification-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPreferences),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Preferences Updated",
        description:
          "Your notification preferences have been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update preferences",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (key: keyof SelectNotificationPreferences) => {
    if (!preferences) return;

    const newPreferences = {
      ...preferences,
      [key]: !preferences[key],
    };
    setPreferences(newPreferences);
    updatePreferences.mutate(newPreferences);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D7FF00]" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-heading font-bold text-[#D7FF00] mb-8">
          Notification Preferences
        </h1>

        <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
          <CardHeader>
            <CardTitle className="text-white">Email Notifications</CardTitle>
            <CardDescription>
              Choose which notifications you'd like to receive via email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-[#D7FF00]" />
                <div>
                  <p className="font-medium text-white">Wager Race Updates</p>
                  <p className="text-sm text-gray-400">
                    Get notified about your position in active wager races
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences?.wagerRaceUpdates}
                onCheckedChange={() => handleToggle("wagerRaceUpdates")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Crown className="h-5 w-5 text-[#D7FF00]" />
                <div>
                  <p className="font-medium text-white">VIP Status Changes</p>
                  <p className="text-sm text-gray-400">
                    Receive updates when your VIP status changes
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences?.vipStatusChanges}
                onCheckedChange={() => handleToggle("vipStatusChanges")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-[#D7FF00]" />
                <div>
                  <p className="font-medium text-white">Promotional Offers</p>
                  <p className="text-sm text-gray-400">
                    Stay updated with our latest promotions and bonuses
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences?.promotionalOffers}
                onCheckedChange={() => handleToggle("promotionalOffers")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-[#D7FF00]" />
                <div>
                  <p className="font-medium text-white">Monthly Statements</p>
                  <p className="text-sm text-gray-400">
                    Receive monthly summaries of your activity
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences?.monthlyStatements}
                onCheckedChange={() => handleToggle("monthlyStatements")}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
