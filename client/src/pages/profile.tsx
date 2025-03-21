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
  Monitor,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { SelectUser } from "@db/schema";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ProfileEmblem, ProfileEmblemEditor } from "@/components/ProfileEmblem";
import { ColorPicker } from "@/components/ColorPicker";
import { RankProgressDisplay } from "@/components/RankProgressDisplay";
import { SessionHistory } from "@/components/SessionHistory";
import { WagerRacePosition } from "@/components/WagerRacePosition";

export default function ProfilePage() {
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profileColor, setProfileColor] = useState("#D7FF00");
  const [activeTab, setActiveTab] = useState("profile");

  const { data: user, isLoading, refetch } = useQuery<SelectUser>({
    queryKey: ["/api/user"],
    retry: 3,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (user) {
      setDisplayName(user.username || "");
      setTelegramUsername(user.telegramUsername || "");
      setBio(user.bio || "");
      setProfileColor(user.profileColor || "#D7FF00");
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
          bio,
          profileColor,
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

  const handleTelegramLogin = async (userData: any) => {
    try {
      const response = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to link Telegram account");
      }

      toast({
        title: "Success",
        description: "Your Telegram account has been linked",
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
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-[#1A1B21] border border-[#2A2B31] mb-6">
              <TabsTrigger value="profile" className="data-[state=active]:bg-[#2A2B31] data-[state=active]:text-[#D7FF00]">
                Profile
              </TabsTrigger>
              <TabsTrigger value="security" className="data-[state=active]:bg-[#2A2B31] data-[state=active]:text-[#D7FF00]">
                Security
              </TabsTrigger>
              <TabsTrigger value="sessions" className="data-[state=active]:bg-[#2A2B31] data-[state=active]:text-[#D7FF00]">
                Sessions
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
              {/* Profile Card */}
              <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      {editMode ? (
                        <ProfileEmblemEditor 
                          username={displayName} 
                          color={profileColor} 
                          onColorChange={setProfileColor} 
                        />
                      ) : (
                        <ProfileEmblem 
                          username={user.username || ""} 
                          color={user.profileColor || "#D7FF00"} 
                          size="lg" 
                        />
                      )}
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
                  
                  {/* Bio Section */}
                  {editMode ? (
                    <div className="mb-6">
                      <label className="block text-[#8A8B91] mb-2">Bio</label>
                      <Textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="bg-[#2A2B31] border-[#3A3B41] text-white resize-none"
                        placeholder="Tell us about yourself..."
                        rows={3}
                      />
                    </div>
                  ) : bio ? (
                    <div className="mb-6 p-4 bg-[#2A2B31]/50 rounded-lg">
                      <p className="text-white">{bio}</p>
                    </div>
                  ) : null}
                  
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
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                className="text-[#8A8B91] hover:text-[#D7FF00] text-xs"
                                onClick={() => setEditMode(true)}
                              >
                                <LinkIcon className="h-3 w-3 mr-1" /> Link Manually
                              </Button>
                              <Button 
                                variant="outline" 
                                className="border-[#D7FF00] text-[#D7FF00] hover:bg-[#D7FF00]/10 text-xs"
                                onClick={() => {
                                  // Create a modal dialog for Telegram login
                                  const modal = document.createElement('div');
                                  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
                                  modal.innerHTML = `
                                    <div class="bg-[#1A1B21] p-6 rounded-xl shadow-xl max-w-md w-full">
                                      <div class="flex justify-between items-center mb-4">
                                        <h3 class="text-xl font-bold text-[#D7FF00]">Link Telegram Account</h3>
                                        <button id="close-telegram-modal" class="text-white hover:text-[#D7FF00]">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                          </svg>
                                        </button>
                                      </div>
                                      <p class="text-white mb-4">Click the button below to link your Telegram account.</p>
                                      <div id="telegram-login-container" class="flex justify-center"></div>
                                    </div>
                                  `;
                                  
                                  document.body.appendChild(modal);
                                  
                                  // Add event listener to close button
                                  document.getElementById('close-telegram-modal')?.addEventListener('click', () => {
                                    document.body.removeChild(modal);
                                  });
                                  
                                  // Add Telegram login widget
                                  const script = document.createElement('script');
                                  script.src = 'https://telegram.org/js/telegram-widget.js?22';
                                  script.setAttribute('data-telegram-login', 'GoatedVipsBot');
                                  script.setAttribute('data-size', 'large');
                                  script.setAttribute('data-auth-url', `${window.location.origin}/api/auth/telegram-callback`);
                                  script.setAttribute('data-request-access', 'write');
                                  script.async = true;
                                  
                                  document.getElementById('telegram-login-container')?.appendChild(script);
                                  
                                  // Handle message from callback
                                  window.addEventListener('message', (event) => {
                                    if (event.data && event.data.telegram) {
                                      handleTelegramLogin(event.data.telegram);
                                      if (document.body.contains(modal)) {
                                        document.body.removeChild(modal);
                                      }
                                    }
                                  });
                                }}
                              >
                                Login with Telegram
                              </Button>
                            </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
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
              
              {/* Rank Progress */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <RankProgressDisplay 
                  currentRank="Bronze"
                  nextRank="Silver"
                  currentXP={0}
                  requiredXP={50000}
                  emblemSrc="/images/Goated Emblems/bronze.e6ea941b.svg"
                />
                <WagerRacePosition userId={user.id} goatedUsername={user.goatedUsername} />
              </div>
            </TabsContent>
            
            <TabsContent value="security">
              <div className="space-y-6">
                <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
                  <CardHeader>
                    <CardTitle className="text-[#D7FF00]">Security Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="text-white font-medium mb-2">Change Password</h3>
                      <div className="space-y-3">
                        <Input
                          type="password"
                          placeholder="Current Password"
                          className="bg-[#2A2B31] border-[#3A3B41] text-white"
                        />
                        <Input
                          type="password"
                          placeholder="New Password"
                          className="bg-[#2A2B31] border-[#3A3B41] text-white"
                        />
                        <Input
                          type="password"
                          placeholder="Confirm New Password"
                          className="bg-[#2A2B31] border-[#3A3B41] text-white"
                        />
                        <Button className="bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90">
                          Update Password
                        </Button>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-[#2A2B31]">
                      <h3 className="text-white font-medium mb-2">Two-Factor Authentication</h3>
                      <p className="text-[#8A8B91] mb-3">
                        Add an extra layer of security to your account by enabling two-factor authentication.
                      </p>
                      <Button variant="outline" className="border-[#D7FF00] text-[#D7FF00] hover:bg-[#D7FF00]/10">
                        Enable 2FA
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
                  <CardHeader>
                    <CardTitle className="text-[#D7FF00]">Account Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="text-white font-medium mb-2">Delete Account</h3>
                      <p className="text-[#8A8B91] mb-3">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      <Button variant="destructive">
                        Delete Account
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="sessions">
              <SessionHistory userId={user.id} />
            </TabsContent>
          </Tabs>
          
          {/* Call to Action */}
          {!user.goatedUsername && (
            <Card className="bg-gradient-to-r from-[#1A1B21] to-[#2A2B31] border-[#2A2B31] mt-6">
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
          )}
        </motion.div>
      </div>
    </div>
  );
}
