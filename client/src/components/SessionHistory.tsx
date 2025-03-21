import React from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Monitor, Smartphone, Tablet, Laptop, Globe, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Session {
  id: number;
  userAgent: string;
  ipAddress: string;
  lastActive: string;
  isActive: boolean;
  createdAt: string;
}

interface SessionHistoryProps {
  userId: number;
}

export function SessionHistory({ userId }: SessionHistoryProps) {
  const { toast } = useToast();
  
  const { data: sessions, isLoading, error, refetch } = useQuery<Session[]>({
    queryKey: ["/api/user/sessions", userId],
    enabled: !!userId,
    retry: 2,
    refetchOnWindowFocus: false,
  });
  
  const terminateSession = async (sessionId: number) => {
    try {
      const response = await fetch(`/api/user/sessions/${sessionId}/terminate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to terminate session");
      }
      
      toast({
        title: "Success",
        description: "Session terminated successfully",
      });
      
      // Refetch sessions to update the list
      refetch();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };
  
  // Helper function to determine device icon based on user agent
  const getDeviceIcon = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    
    if (ua.includes("iphone") || ua.includes("android") && ua.includes("mobile")) {
      return <Smartphone className="h-5 w-5 text-[#D7FF00]" />;
    } else if (ua.includes("ipad") || ua.includes("android") && !ua.includes("mobile")) {
      return <Tablet className="h-5 w-5 text-[#D7FF00]" />;
    } else if (ua.includes("windows") || ua.includes("macintosh") || ua.includes("linux")) {
      return <Laptop className="h-5 w-5 text-[#D7FF00]" />;
    } else {
      return <Globe className="h-5 w-5 text-[#D7FF00]" />;
    }
  };
  
  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };
  
  // Helper function to get device name
  const getDeviceName = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    
    if (ua.includes("iphone")) {
      return "iPhone";
    } else if (ua.includes("ipad")) {
      return "iPad";
    } else if (ua.includes("android") && ua.includes("mobile")) {
      return "Android Phone";
    } else if (ua.includes("android")) {
      return "Android Tablet";
    } else if (ua.includes("macintosh")) {
      return "Mac";
    } else if (ua.includes("windows")) {
      return "Windows PC";
    } else if (ua.includes("linux")) {
      return "Linux";
    } else {
      return "Unknown Device";
    }
  };
  
  // Helper function to get browser name
  const getBrowserName = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    
    if (ua.includes("chrome") && !ua.includes("edg")) {
      return "Chrome";
    } else if (ua.includes("firefox")) {
      return "Firefox";
    } else if (ua.includes("safari") && !ua.includes("chrome")) {
      return "Safari";
    } else if (ua.includes("edg")) {
      return "Edge";
    } else if (ua.includes("opera") || ua.includes("opr")) {
      return "Opera";
    } else {
      return "Unknown Browser";
    }
  };
  
  if (isLoading) {
    return (
      <div className="bg-[#1A1B21]/50 backdrop-blur-sm border border-[#2A2B31] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Monitor className="h-5 w-5 text-[#D7FF00]" />
          <h3 className="text-xl font-heading text-white">Active Sessions</h3>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-16 bg-[#2A2B31] rounded-md w-full"></div>
          <div className="h-16 bg-[#2A2B31] rounded-md w-full"></div>
        </div>
      </div>
    );
  }
  
  if (error || !sessions) {
    return (
      <div className="bg-[#1A1B21]/50 backdrop-blur-sm border border-[#2A2B31] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Monitor className="h-5 w-5 text-[#D7FF00]" />
          <h3 className="text-xl font-heading text-white">Active Sessions</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-[#8A8B91]">
            Unable to load session data. Please try again later.
          </p>
        </div>
      </div>
    );
  }
  
  const currentSession = sessions.find(session => session.isActive);
  const otherSessions = sessions.filter(session => !session.isActive);
  
  return (
    <div className="bg-[#1A1B21]/50 backdrop-blur-sm border border-[#2A2B31] rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Monitor className="h-5 w-5 text-[#D7FF00]" />
        <h3 className="text-xl font-heading text-white">Active Sessions</h3>
      </div>
      
      <div className="space-y-6">
        {currentSession && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-green-500 h-2 w-2 rounded-full"></div>
              <h4 className="text-white font-medium">Current Session</h4>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#2A2B31]/50 rounded-lg p-4 border border-[#3A3B41]"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {getDeviceIcon(currentSession.userAgent)}
                  <div>
                    <div className="text-white font-medium">
                      {getDeviceName(currentSession.userAgent)} • {getBrowserName(currentSession.userAgent)}
                    </div>
                    <div className="text-[#8A8B91] text-sm flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      <span>Active since {formatDate(currentSession.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full text-xs">
                  Current
                </div>
              </div>
            </motion.div>
          </div>
        )}
        
        {otherSessions.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-[#8A8B91] h-2 w-2 rounded-full"></div>
              <h4 className="text-white font-medium">Other Sessions</h4>
            </div>
            
            <div className="space-y-3">
              {otherSessions.map((session) => (
                <motion.div 
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#2A2B31]/50 rounded-lg p-4 border border-[#3A3B41]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getDeviceIcon(session.userAgent)}
                      <div>
                        <div className="text-white font-medium">
                          {getDeviceName(session.userAgent)} • {getBrowserName(session.userAgent)}
                        </div>
                        <div className="text-[#8A8B91] text-sm flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          <span>Last active {formatDate(session.lastActive)}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                      onClick={() => terminateSession(session.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
        
        {sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-[#8A8B91]">
              No active sessions found.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
