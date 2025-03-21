import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Trophy,
  Award,
  Clock,
  ExternalLink,
  Link as LinkIcon,
  Edit,
  Save,
  Star,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { SelectUser } from "@db/schema";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function ProfilePage() {
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");

  const { data: user, isLoading, refetch } = useQuery<SelectUser>({
    queryKey: ["/api/user"],
    retry: 3,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (user) {
      setDisplayName(user.username || "");
      setTelegramUsername(user.telegramUsername || "");
    }
  }, [user]);

  const saveProfile = async () => {
    try {
      const response = await fetch("/api/user/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: displayName,
          telegramUsername,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update profile");
      }

      toast({
        title: "Success",
        description: "Your profile has been updated",
      });
      
      setEditMode(false);
      refetch();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };

  if (isLoading) return <LoadingSpinner />;
  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#14151A]">
        <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31] max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-[#D7FF00] font-heading">Not Logged In</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-white mb-4">Please log in to view your profile</p>
            <Button 
              onClick={() => window.location.href = "/auth"}
              className="bg-[#D7FF00] text-[#14151A] hover:bg-[#D7FF00]/80"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#14151A] text-white">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8 max-w-4xl mx-auto"
        >
          <h1 className="text-2xl md:text-3xl font-heading text-[#D7FF00]">My Profile</h1>
          
          {/* Profile Card */}
          <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[#2A2B31] flex items-center justify-center">
                    <User className="h-8 w-8 text-[#D7FF00]" />
                  </div>
                  <div>
                    {editMode ? (
                      <Input 
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="bg-[#2A2B31] border-[#3A3B41] text-white mb-1"
                        placeholder="Display Name"
                      />
                    ) : (
                      <h2 className="text-xl font-bold text-white">{user.username}</h2>
                    )}
                    <p className="text-[#8A8B91] flex items-center gap-1">
                      <Mail className="h-4 w-4" /> {user.email || "No email provided"}
                    </p>
                  </div>
                </div>
                {editMode ? (
                  <Button 
                    onClick={saveProfile} 
                    variant="outline" 
                    className="border-[#D7FF00] text-[#D7FF00] hover:bg-[#D7FF00]/10"
                  >
                    <Save className="h-4 w-4 mr-2" /> Save
                  </Button>
                ) : (
                  <Button 
                    onClick={() => setEditMode(true)} 
                    variant="outline" 
                    className="border-[#2A2B31] text-white hover:border-[#D7FF00] hover:text-[#D7FF00]"
                  >
                    <Edit className="h-4 w-4 mr-2" /> Edit
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-[#D7FF00] font-medium">Account Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 border-b border-[#2A2B31]">
                      <span className="text-[#8A8B91]">Member Since</span>
                      <span className="text-white">{new Date(user.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[#2A2B31]">
                      <span className="text-[#8A8B91]">User ID</span>
                      <span className="text-white font-mono text-sm">{user.id}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[#2A2B31]">
                      <span className="text-[#8A8B91]">Status</span>
                      <span className="bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full text-xs">Active</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-[#D7FF00] font-medium">Linked Accounts</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-[#2A2B31] rounded-lg">
                      <div className="flex items-center gap-2">
                        <img src="/images/telegram.svg" alt="Telegram" className="h-5 w-5" />
                        <span>Telegram</span>
                      </div>
                      {editMode ? (
                        <Input 
                          value={telegramUsername}
                          onChange={(e) => setTelegramUsername(e.target.value)}
                          className="bg-[#3A3B41] border-[#4A4B51] text-white w-40"
                          placeholder="@username"
                        />
                      ) : user.telegramUsername ? (
                        <span className="text-[#D7FF00]">@{user.telegramUsername}</span>
                      ) : (
                        <Button 
                          variant="ghost" 
                          className="text-[#8A8B91] hover:text-[#D7FF00] text-xs"
                          onClick={() => setEditMode(true)}
                        >
                          <LinkIcon className="h-3 w-3 mr-1" /> Link
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-[#2A2B31] rounded-lg">
                      <div className="flex items-center gap-2">
                        <img src="/images/goated-icon.png" alt="Goated" className="h-5 w-5" />
                        <span>Goated.com</span>
                      </div>
                      {user.goatedId ? (
                        <span className="text-[#D7FF00]">Connected</span>
                      ) : (
                        <Button 
                          variant="ghost" 
                          className="text-[#8A8B91] hover:text-[#D7FF00] text-xs"
                        >
                          <LinkIcon className="h-3 w-3 mr-1" /> Connect
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="h-5 w-5 text-[#D7FF00]" />
                  <h3 className="font-medium">Total Wagered</h3>
                </div>
                <p className="text-2xl font-bold">$0</p>
                <p className="text-xs text-[#8A8B91] mt-1">Connect your Goated account to track</p>
              </CardContent>
            </Card>
            
            <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="h-5 w-5 text-[#D7FF00]" />
                  <h3 className="font-medium">Races Joined</h3>
                </div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-[#8A8B91] mt-1">No race participation yet</p>
              </CardContent>
            </Card>
            
            <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="h-5 w-5 text-[#D7FF00]" />
                  <h3 className="font-medium">Bonus Codes</h3>
                </div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-[#8A8B91] mt-1">No bonus codes redeemed</p>
              </CardContent>
            </Card>
            
            <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-5 w-5 text-[#D7FF00]" />
                  <h3 className="font-medium">Last Activity</h3>
                </div>
                <p className="text-lg font-bold">Just Now</p>
                <p className="text-xs text-[#8A8B91] mt-1">Viewed profile page</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Call to Action */}
          <Card className="bg-gradient-to-r from-[#1A1B21] to-[#2A2B31] border-[#2A2B31]">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-[#D7FF00] mb-2">Ready to start earning?</h3>
                  <p className="text-[#8A8B91] max-w-lg">
                    Connect your Goated.com account to start tracking your wagers and earning rewards in our monthly races!
                  </p>
                </div>
                <Button
                  className="bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90 transition-all duration-300 gap-2"
                  onClick={() => window.open("https://www.goated.com/r/EARLYACCESS", "_blank")}
                >
                  <span>Connect to Goated</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
} 