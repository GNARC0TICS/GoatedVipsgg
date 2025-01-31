
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function UserSettings() {
  const { data: user } = useQuery({
    queryKey: ["/api/profile"],
  });

  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="grid w-full grid-cols-3 bg-[#1A1B21]">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="preferences">Preferences</TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-white">Profile Information</h3>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-full bg-[#2A2B31] flex items-center justify-center">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm text-[#8A8B91]">Username</p>
                  <p className="text-white">{user?.username}</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm text-[#8A8B91]">Email</p>
              <p className="text-white">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-[#8A8B91]">Verification Status</p>
              <Badge variant={user?.isVerified ? "success" : "secondary"}>
                {user?.isVerified ? "Verified" : "Pending Verification"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="account">
        <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-white">Account Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-[#8A8B91]">Telegram Username</label>
                  <Input placeholder="@username" className="mt-1" />
                </div>
                <Button variant="outline">Update Settings</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="preferences">
        <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-white">Notification Preferences</h3>
              {/* Add notification preferences here */}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
