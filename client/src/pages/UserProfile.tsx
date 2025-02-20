import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Trophy,
  User,
  LineChart,
  Award,
  Clock,
  ArrowLeft,
  TrendingUp,
  Medal,
  Star,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AchievementCard } from '@/components/AchievementCard';
import { AchievementService } from '@/lib/achievements/service';
import { Achievement } from '@/lib/achievements/types';


interface UserStats {
  id: string; // Added ID for API calls
  username: string;
  totalWagered: number;
  currentRank: number;
  bestRank: number;
  races: {
    participated: number;
    won: number;
    totalPrizes: number;
  };
  achievements: {
    unlocked: string[];
    progress: Record<string, number>;
  };
  history: Array<{
    period: string;
    wagered: number;
    rank: number;
    prize: number;
  }>;
  bio?: string; // Added bio field
  profileColor?: string; // Added profile color field
}

const PROFILE_COLORS = {
  yellow: '#D7FF00',
  emerald: '#10B981',
  sapphire: '#3B82F6',
  ruby: '#EF4444',
  amethyst: '#8B5CF6',
  gold: '#F59E0B',
  pearl: '#F3F4F6',
  obsidian: '#1F2937',
  diamond: '#60A5FA'
};

const getTierFromWager = (wager: number): string => {
  if (wager >= 1000000) return 'diamond';
  if (wager >= 500000) return 'platinum';
  if (wager >= 100000) return 'gold';
  if (wager >= 50000) return 'silver';
  return 'bronze';
};

const getTierIcon = (tier: string): string => {
  return `/images/tiers/${tier}.svg`;
};

export default function UserProfile({ params }: { params: { id: string } }) {
  const [, setLocation] = useLocation();
  const userId = params.id;

  const { data: user, isLoading, refetch } = useQuery<UserStats>({
    queryKey: [`/api/users/${userId}`],
  });

  if (isLoading) return <LoadingSpinner />;
  if (!user) return null;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const EditProfileDialog = ({ user, onUpdate }: { user: UserStats; onUpdate: () => void }) => {
    const [bio, setBio] = useState(user.bio || '');
    const [color, setColor] = useState(user.profileColor || '#D7FF00');

    const handleSubmit = async () => {
      await fetch(`/api/users/${user.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio, profileColor: color })
      });
      onUpdate();
    };

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">Edit Profile</Button>
        </DialogTrigger>
        <DialogContent className="bg-[#1A1B21] border-[#2A2B31]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Bio</Label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} />
            </div>
            <div>
              <Label>Profile Color</Label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {Object.entries(PROFILE_COLORS).map(([name, value]) => (
                  <div
                    key={name}
                    className={`w-8 h-8 rounded-full cursor-pointer ${color === value ? 'ring-2 ring-white' : ''}`}
                    style={{ backgroundColor: value }}
                    onClick={() => setColor(value)}
                  />
                ))}
              </div>
            </div>
            <Button onClick={handleSubmit}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const [activeTab, setActiveTab] = useState('overview');
  
  return (
    <div className="min-h-screen">
      {/* Profile Banner */}
      <div 
        className="h-48 bg-cover bg-center relative"
        style={{ 
          backgroundImage: user.bannerImage ? `url(${user.bannerImage})` : `linear-gradient(to right, ${user.customTheme?.primary || '#D7FF00'}, ${user.customTheme?.secondary || '#1A1B21'})`
        }}
      >
        <div className="absolute bottom-0 left-0 w-full h-full bg-gradient-to-t from-black/50 to-transparent" />
      </div>
      
      {/* Quick Stats Bar */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 py-2 flex justify-between items-center">
          <div className="flex items-center space-x-8">
            <span>Rank #{user.currentRank}</span>
            <span>${user.totalWagered.toLocaleString()} Wagered</span>
            <span>{user.races.won} Races Won</span>
          </div>
          <div className="flex items-center space-x-4">
            {user.socialLinks?.telegram && (
              <a href={user.socialLinks.telegram} target="_blank" rel="noopener" className="text-white/80 hover:text-white">
                <MessageCircle className="h-5 w-5" />
              </a>
            )}
            <Button variant="outline" size="sm">Share Profile</Button>
          </div>
        </div>
      </div> {/* Apply profile color */}
      <div className="container mx-auto px-4 py-8 md:py-16">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Header */}
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-between"
          >
            <Button
              variant="ghost"
              className="gap-2"
              onClick={() => setLocation("/wager-races")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Races
            </Button>
            <EditProfileDialog user={user} onUpdate={refetch} /> {/* Add Edit Profile Dialog */}
          </motion.div>

          {/* User Info */}
          <motion.div variants={itemVariants}>
            <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-[#2A2B31] flex items-center justify-center">
                      <img
                        src={getTierIcon(getTierFromWager(user.totalWagered))}
                        alt="Tier"
                        className="w-16 h-16"
                      />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-[#D7FF00] text-black font-bold px-2 py-1 rounded-full text-sm">
                      #{user.currentRank}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl md:text-3xl font-heading font-bold text-[#D7FF00] mb-2">
                        {user.username}
                      </h1>
                      {user.isVerified && <VerificationBadge size="lg" />}
                    </div>
                    <p className="text-sm text-[#8A8B91] mb-2">{user.bio || "No bio provided"}</p> {/* Display bio */}
                    <div className="flex flex-wrap gap-4 text-sm text-[#8A8B91]">
                      <div className="flex items-center gap-2">
                        <LineChart className="h-4 w-4 text-[#D7FF00]" />
                        Total Wagered: ${user.totalWagered.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-[#D7FF00]" />
                        Best Rank: #{user.bestRank}
                      </div>
                      <div className="flex items-center gap-2">
                        <Medal className="h-4 w-4 text-[#D7FF00]" />
                        Races Won: {user.races.won}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-5 w-5 text-[#D7FF00]" />
                  <span className="text-sm text-[#8A8B91]">Total Prizes</span>
                </div>
                <p className="text-2xl font-bold">
                  ${user.races.totalPrizes.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-5 w-5 text-[#D7FF00]" />
                  <span className="text-sm text-[#8A8B91]">
                    Races Participated
                  </span>
                </div>
                <p className="text-2xl font-bold">{user.races.participated}</p>
              </CardContent>
            </Card>

            <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-5 w-5 text-[#D7FF00]" />
                  <span className="text-sm text-[#8A8B91]">Win Rate</span>
                </div>
                <p className="text-2xl font-bold">
                  {((user.races.won / user.races.participated) * 100).toFixed(
                    1,
                  )}
                  %
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Achievements Section */}
          <motion.div variants={itemVariants}>
            <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-heading font-bold text-white">Achievements</h2>
                  <div className="text-sm text-[#8A8B91]">
                    {user.achievements?.unlocked?.length || 0} / {AchievementService.getInstance().getAllAchievements().length} Unlocked
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {AchievementService.getInstance().getAllAchievements().map((achievement) => (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                      isUnlocked={user.achievements?.unlocked?.includes(achievement.id)}
                      progress={user.achievements?.progress?.[achievement.id] || 0}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* History Table */}
          <motion.div variants={itemVariants}>
            <h2 className="text-xl font-heading font-bold text-white mb-4">
              Race History
            </h2>
            <div className="bg-[#1A1B21]/50 backdrop-blur-sm rounded-xl border border-[#2A2B31] overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-heading text-[#D7FF00]">
                        PERIOD
                      </TableHead>
                      <TableHead className="text-right font-heading text-[#D7FF00]">
                        WAGERED
                      </TableHead>
                      <TableHead className="text-right font-heading text-[#D7FF00]">
                        RANK
                      </TableHead>
                      <TableHead className="text-right font-heading text-[#D7FF00]">
                        PRIZE
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {user.history.map((record) => (
                      <TableRow key={record.period}>
                        <TableCell className="font-medium">
                          {record.period}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            ${record.wagered.toLocaleString()}
                            {record.wagered > 0 && (
                              <TrendingUp className="h-4 w-4 text-green-400" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          #{record.rank}
                        </TableCell>
                        <TableCell className="text-right text-[#D7FF00]">
                          ${record.prize.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}