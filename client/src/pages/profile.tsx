import { useState, useEffect, useCallback } from "react";
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
import { RankProgressDisplay } from "@/components/RankProgressDisplay";
import { SessionHistory } from "@/components/SessionHistory";
import { WagerRacePosition } from "@/components/WagerRacePosition";
import debounce from "lodash/debounce";

export default function ProfilePage() {
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
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

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(async (data: { username: string; telegramUsername: string; bio: string; profileColor: string }) => {
      try {
        setIsUpdating(true);
        const response = await fetch("/api/user/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
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
      } finally {
        setIsUpdating(false);
      }
    }, 1000),
    [toast, refetch]
  );

  const saveProfile = () => {
    debouncedSave({
      username: displayName,
      telegramUsername,
      bio,
      profileColor,
    });
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

  // Define animation variants for staggered animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#14151A] to-[#1A1B21] text-white">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[url('/images/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />

      <div className="container mx-auto px-4 py-8 md:py-16">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8 max-w-4xl mx-auto"
        >
          <motion.div 
            variants={itemVariants}
            className="flex items-center gap-3"
          >
            <h1 className="text-2xl md:text-3xl font-heading text-[#D7FF00] tracking-wide">My Profile</h1>
            <div className="h-px flex-grow bg-gradient-to-r from-[#D7FF00]/50 to-transparent"></div>
          </motion.div>

          {/* Profile Card */}
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-[#1A1B21]/80 to-[#14151A]/90 backdrop-blur-md border border-[#2A2B31]/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-xl transition-all duration-300 hover:shadow-[0_8px_30px_rgba(215,255,0,0.1)] group relative overflow-hidden">
              {/* Subtle background pattern */}
              <div className="absolute inset-0 bg-[url('/images/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />

              {/* Subtle hover effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#2A2B31]/0 via-[#D7FF00]/5 to-[#2A2B31]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-xl blur-sm" />

              <CardContent className="p-6 relative z-10">
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
                        color={profileColor}
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
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <LoadingSpinner size="sm" className="mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      {isUpdating ? "Saving..." : "Save"}
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
          </motion.div>

          {/* Stats Cards */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-[#1A1B21]/80 to-[#14151A]/90 backdrop-blur-md border border-[#2A2B31]/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-xl transition-all duration-300 hover:shadow-[0_8px_30px_rgba(215,255,0,0.05)] group relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('/images/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
              <CardContent className="p-4 relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="h-5 w-5 text-[#D7FF00]" />
                  <h3 className="font-medium">Total Wagered</h3>
                </div>
                <p className="text-2xl font-bold">$0</p>
                <p className="text-xs text-[#8A8B91] mt-1">Connect your Goated account to track</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#1A1B21]/80 to-[#14151A]/90 backdrop-blur-md border border-[#2A2B31]/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-xl transition-all duration-300 hover:shadow-[0_8px_30px_rgba(215,255,0,0.05)] group relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('/images/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
              <CardContent className="p-4 relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="h-5 w-5 text-[#D7FF00]" />
                  <h3 className="font-medium">Races Joined</h3>
                </div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-[#8A8B91] mt-1">No race participation yet</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#1A1B21]/80 to-[#14151A]/90 backdrop-blur-md border border-[#2A2B31]/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-xl transition-all duration-300 hover:shadow-[0_8px_30px_rgba(215,255,0,0.05)] group relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('/images/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
              <CardContent className="p-4 relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="h-5 w-5 text-[#D7FF00]" />
                  <h3 className="font-medium">Bonus Codes</h3>
                </div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-[#8A8B91] mt-1">No bonus codes redeemed</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#1A1B21]/80 to-[#14151A]/90 backdrop-blur-md border border-[#2A2B31]/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-xl transition-all duration-300 hover:shadow-[0_8px_30px_rgba(215,255,0,0.05)] group relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('/images/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
              <CardContent className="p-4 relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-5 w-5 text-[#D7FF00]" />
                  <h3 className="font-medium">Last Activity</h3>
                </div>
                <p className="text-lg font-bold">Just Now</p>
                <p className="text-xs text-[#8A8B91] mt-1">Viewed profile page</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Bio Section */}
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-[#1A1B21]/80 to-[#14151A]/90 backdrop-blur-md border border-[#2A2B31]/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-xl transition-all duration-300 hover:shadow-[0_8px_30px_rgba(215,255,0,0.1)] group relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('/images/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#2A2B31]/0 via-[#D7FF00]/5 to-[#2A2B31]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-xl blur-sm" />
              <CardContent className="p-6 relative z-10">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[#D7FF00] font-medium tracking-wide">About Me</h3>
                  {!editMode && (
                    <Button 
                      onClick={() => setEditMode(true)} 
                      variant="ghost" 
                      size="sm"
                      className="text-[#8A8B91] hover:text-[#D7FF00] transition-all duration-300 hover:bg-[#2A2B31]/50 rounded-md"
                    >
                      <Edit className="h-4 w-4 mr-1.5" /> 
                      <span className="text-sm">Edit</span>
                    </Button>
                  )}
                </div>

                {editMode ? (
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    className="bg-[#2A2B31] border-[#3A3B41] focus:border-[#D7FF00]/50 focus:ring-[#D7FF00]/20 text-white min-h-[120px] rounded-lg resize-none transition-all duration-300 placeholder:text-[#8A8B91]/70"
                  />
                ) : (
                  <p className="text-[#EBEBEB] whitespace-pre-wrap leading-relaxed text-base tracking-wide">
                    {bio || 
                      <span className="text-[#8A8B91] italic">No bio provided. Click edit to add information about yourself.</span>
                    }
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Tabs Section */}
          <motion.div variants={itemVariants}>
            <Tabs defaultValue="stats" className="w-full" onValueChange={setActiveTab}>
              <TabsList className="bg-gradient-to-r from-[#1A1B21] via-[#2A2B31] to-[#1A1B21] border border-[#3A3B41] rounded-xl p-1 mb-6 flex w-full md:w-auto overflow-x-auto scrollbar-hide">
                <TabsTrigger 
                  value="stats" 
                  className="data-[state=active]:bg-[#D7FF00] data-[state=active]:text-black data-[state=active]:shadow-md px-4 py-2 rounded-lg transition-all duration-300 text-[#EBEBEB] hover:text-white data-[state=inactive]:hover:bg-[#2A2B31]/80"
                >
                  Stats
                </TabsTrigger>
                <TabsTrigger 
                  value="rank" 
                  className="data-[state=active]:bg-[#D7FF00] data-[state=active]:text-black data-[state=active]:shadow-md px-4 py-2 rounded-lg transition-all duration-300 text-[#EBEBEB] hover:text-white data-[state=inactive]:hover:bg-[#2A2B31]/80"
                >
                  Rank Progress
                </TabsTrigger>
                <TabsTrigger 
                  value="sessions" 
                  className="data-[state=active]:bg-[#D7FF00] data-[state=active]:text-black data-[state=active]:shadow-md px-4 py-2 rounded-lg transition-all duration-300 text-[#EBEBEB] hover:text-white data-[state=inactive]:hover:bg-[#2A2B31]/80"
                >
                  Sessions
                </TabsTrigger>
                <TabsTrigger 
                  value="races" 
                  className="data-[state=active]:bg-[#D7FF00] data-[state=active]:text-black data-[state=active]:shadow-md px-4 py-2 rounded-lg transition-all duration-300 text-[#EBEBEB] hover:text-white data-[state=inactive]:hover:bg-[#2A2B31]/80"
                >
                  Wager Races
                </TabsTrigger>
              </TabsList>

              <TabsContent 
                value="stats" 
                className="mt-4 transition-all duration-500 animate-in fade-in-50"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-[#1A1B21]/80 to-[#14151A]/90 backdrop-blur-md border border-[#2A2B31]/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-xl transition-all duration-300 hover:shadow-[0_8px_30px_rgba(215,255,0,0.05)] group relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/images/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
                    <CardContent className="p-4 relative z-10">
                      <div className="flex items-center gap-2 mb-3">
                        <Trophy className="h-5 w-5 text-[#D7FF00]" />
                        <h3 className="font-medium">Total Wagered</h3>
                      </div>
                      <p className="text-2xl font-bold">$0</p>
                      <p className="text-xs text-[#8A8B91] mt-1">Connect your Goated account to track</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-[#1A1B21]/80 to-[#14151A]/90 backdrop-blur-md border border-[#2A2B31]/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-xl transition-all duration-300 hover:shadow-[0_8px_30px_rgba(215,255,0,0.05)] group relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/images/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
                    <CardContent className="p-4 relative z-10">
                      <div className="flex items-center gap-2 mb-3">
                        <Award className="h-5 w-5 text-[#D7FF00]" />
                        <h3 className="font-medium">Races Joined</h3>
                      </div>
                      <p className="text-2xl font-bold">0</p>
                      <p className="text-xs text-[#8A8B91] mt-1">No race participation yet</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-[#1A1B21]/80 to-[#14151A]/90 backdrop-blur-md border border-[#2A2B31]/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-xl transition-all duration-300 hover:shadow-[0_8px_30px_rgba(215,255,0,0.05)] group relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/images/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
                    <CardContent className="p-4 relative z-10">
                      <div className="flex items-center gap-2 mb-3">
                        <Star className="h-5 w-5 text-[#D7FF00]" />
                        <h3 className="font-medium">Bonus Codes</h3>
                      </div>
                      <p className="text-2xl font-bold">0</p>
                      <p className="text-xs text-[#8A8B91] mt-1">No bonus codes redeemed</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-[#1A1B21]/80 to-[#14151A]/90 backdrop-blur-md border border-[#2A2B31]/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-xl transition-all duration-300 hover:shadow-[0_8px_30px_rgba(215,255,0,0.05)] group relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/images/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
                    <CardContent className="p-4 relative z-10">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="h-5 w-5 text-[#D7FF00]" />
                        <h3 className="font-medium">Last Activity</h3>
                      </div>
                      <p className="text-lg font-bold">Just Now</p>
                      <p className="text-xs text-[#8A8B91] mt-1">Viewed profile page</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent 
                value="rank" 
                className="mt-4 transition-all duration-500 animate-in fade-in-50"
              >
                <RankProgressDisplay wagerAmount={user.totalWagered || 0} />
              </TabsContent>

              <TabsContent 
                value="sessions" 
                className="mt-4 transition-all duration-500 animate-in fade-in-50"
              >
                <SessionHistory userId={user.id} />
              </TabsContent>

              <TabsContent 
                value="races" 
                className="mt-4 transition-all duration-500 animate-in fade-in-50"
              >
                <WagerRacePosition userId={user.id} goatedUsername={user.goatedUsername} />
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* Call to Action */}
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-r from-[#1A1B21] to-[#2A2B31] border-[#2A2B31] relative overflow-hidden group">
              {/* Animated gradient border */}
              <div className="absolute -inset-[1px] bg-gradient-to-r from-[#D7FF00]/0 via-[#D7FF00]/30 to-[#D7FF00]/0 opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-1000 rounded-xl"></div>

              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#1A1B21] to-[#2A2B31] rounded-xl z-0"></div>

              <CardContent className="p-6 relative z-10">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
                  <div>
                    <h3 className="text-[#D7FF00] font-medium">Connect Your Accounts</h3>
                    <p className="text-[#8A8B91] mt-1">Link your accounts to unlock all features</p>
                  </div>
                  <div className="flex gap-4">
                    <Button 
                      variant="outline" 
                      className="border-[#2A2B31] text-white hover:border-[#D7FF00] hover:text-[#D7FF00]"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" /> Connect Goated
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-[#2A2B31] text-white hover:border-[#D7FF00] hover:text-[#D7FF00]"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" /> Join Telegram
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
