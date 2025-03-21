import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Monitor, Smartphone, Clock, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface SessionHistoryProps {
  userId: number;
}

interface Session {
  id: number;
  userAgent: string;
  ipAddress: string;
  lastActive: string;
  isActive: boolean;
  createdAt: string;
}

export function SessionHistory({ userId }: SessionHistoryProps) {
  const { toast } = useToast();
  
  const { data: sessions, isLoading, refetch } = useQuery<Session[]>({
    queryKey: ["user-sessions", userId],
    queryFn: async () => {
      const response = await fetch("/api/user/sessions");
      if (!response.ok) {
        throw new Error("Failed to fetch sessions");
      }
      return response.json();
    },
    refetchOnWindowFocus: false,
  });
  
  const terminateSession = async (sessionId: number) => {
    try {
      const response = await fetch(`/api/user/sessions/${sessionId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to terminate session");
      }
      
      toast({
        title: "Success",
        description: "Session terminated successfully",
      });
      
      refetch();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };
  
  const getDeviceIcon = (userAgent: string) => {
    if (userAgent.toLowerCase().includes("mobile")) {
      return <Smartphone className="h-5 w-5 text-[#D7FF00]" />;
    }
    return <Monitor className="h-5 w-5 text-[#D7FF00]" />;
  };
  
  const getDeviceName = (userAgent: string) => {
    if (!userAgent) return "Unknown Device";
    
    if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
      return userAgent.includes("iPhone") ? "iPhone" : "iPad";
    } else if (userAgent.includes("Android")) {
      return "Android Device";
    } else if (userAgent.includes("Windows")) {
      return "Windows PC";
    } else if (userAgent.includes("Mac")) {
      return "Mac";
    } else if (userAgent.includes("Linux")) {
      return "Linux";
    }
    
    return "Unknown Device";
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#D7FF00]"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
        <CardContent className="p-6">
          <h3 className="text-xl font-bold text-[#D7FF00] mb-4">Active Sessions</h3>
          
          {sessions && sessions.length > 0 ? (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div 
                  key={session.id} 
                  className="flex items-start justify-between p-4 bg-[#2A2B31] rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    {getDeviceIcon(session.userAgent)}
                    <div>
                      <h4 className="font-medium text-white">{getDeviceName(session.userAgent)}</h4>
                      <div className="text-sm text-[#8A8B91] space-y-1 mt-1">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Last active: {formatDate(session.lastActive)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>IP: {session.ipAddress}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {session.isActive && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-red-500 text-red-500 hover:bg-red-500/10"
                      onClick={() => terminateSession(session.id)}
                    >
                      Terminate
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#8A8B91] text-center py-4">No active sessions found</p>
          )}
          
          <div className="mt-6 pt-4 border-t border-[#2A2B31]">
            <Button 
              variant="outline" 
              className="w-full border-red-500 text-red-500 hover:bg-red-500/10"
              onClick={async () => {
                try {
                  const response = await fetch("/api/user/sessions/all", {
                    method: "DELETE",
                  });
                  
                  if (!response.ok) {
                    throw new Error("Failed to terminate all sessions");
                  }
                  
                  toast({
                    title: "Success",
                    description: "All sessions terminated. You will be logged out shortly.",
                  });
                  
                  // Redirect to login after a short delay
                  setTimeout(() => {
                    window.location.href = "/auth";
                  }, 2000);
                } catch (error) {
                  toast({
                    variant: "destructive",
                    title: "Error",
                    description: error instanceof Error ? error.message : "An unknown error occurred",
                  });
                }
              }}
            >
              Terminate All Sessions
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
        <CardContent className="p-6">
          <h3 className="text-xl font-bold text-[#D7FF00] mb-4">Security Tips</h3>
          <ul className="space-y-2 text-[#8A8B91]">
            <li className="flex items-start gap-2">
              <span className="text-[#D7FF00] font-bold">•</span>
              <span>Regularly review your active sessions and terminate any that you don't recognize.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#D7FF00] font-bold">•</span>
              <span>Use a strong, unique password for your account.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#D7FF00] font-bold">•</span>
              <span>Enable two-factor authentication for an extra layer of security.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#D7FF00] font-bold">•</span>
              <span>Be cautious when accessing your account from public or shared devices.</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
