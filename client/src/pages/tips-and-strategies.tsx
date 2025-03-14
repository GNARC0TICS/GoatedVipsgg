import { motion } from "framer-motion";
import { ArrowLeft, Star, ThumbsUp, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

// Temporary data structure for featured strategies
const FEATURED_STRATEGIES = [
  {
    id: 1,
    title: "Bankroll Management 101",
    author: "Goombas Team",
    category: "Fundamentals",
    description: "Master the basics of managing your bankroll effectively...",
    votes: 342,
    isPinned: true,
  },
  {
    id: 2,
    title: "Understanding House Edge",
    author: "Goombas Team",
    category: "Education",
    description: "Learn about house edge and how it affects your gameplay...",
    votes: 289,
    isPinned: true,
  },
];

// Temporary data structure for community strategies
const COMMUNITY_STRATEGIES = [
  {
    id: 3,
    title: "My Journey to Diamond VIP",
    author: "CasinoExpert",
    category: "Experience",
    description:
      "A detailed breakdown of my path to reaching Diamond VIP status...",
    votes: 156,
    isPinned: false,
  },
  // Add more community strategies here
];

export default function TipsAndStrategies() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#14151A] text-white">
      <div className="container mx-auto px-4 pt-2 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="mb-4">
            <video
              autoPlay
              muted
              playsInline
              className="w-full h-48 md:h-64 object-contain"
            >
              <source
                src="/images/Page Headers/TIPSHEAD.MP4"
                type="video/mp4"
              />
            </video>
          </div>

          <Button
            variant="ghost"
            className="gap-2 mb-8"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>

          <div className="prose prose-invert max-w-none">
            {/* Search and Filter Section */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#8A8B91]" />
                <Input
                  placeholder="Search strategies..."
                  className="pl-10 bg-[#1A1B21] border-[#2A2B31]"
                />
              </div>
              <Select>
                <SelectTrigger className="w-full md:w-[200px] bg-[#1A1B21] border-[#2A2B31]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="fundamentals">Fundamentals</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="experience">Experience</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Featured Strategies */}
            <section className="mb-12">
              <h2 className="text-2xl font-heading text-white mb-6">
                Featured Strategies
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {FEATURED_STRATEGIES.map((strategy) => (
                  <FeaturedStrategyCard key={strategy.id} strategy={strategy} />
                ))}
              </div>
            </section>

            {/* Community Strategies */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-heading text-white">
                  Community Strategies
                </h2>
                <Button className="bg-[#D7FF00] text-[#14151A] hover:bg-[#D7FF00]/90">
                  Share Your Strategy
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {COMMUNITY_STRATEGIES.map((strategy) => (
                  <StrategyCard key={strategy.id} strategy={strategy} />
                ))}
              </div>
            </section>

            {/* Add Strategy Section */}
            <section className="mt-12">
              <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
                <CardContent className="p-6">
                  <h2 className="text-2xl font-heading text-[#D7FF00] mb-4">
                    Share Your Knowledge
                  </h2>
                  <p className="text-[#8A8B91] mb-4">
                    Have a winning strategy? Share it with the community and
                    help others succeed! Your contributions make our community
                    stronger.
                  </p>
                  <Button className="bg-[#D7FF00] text-[#14151A] hover:bg-[#D7FF00]/90">
                    Submit Your Strategy
                  </Button>
                </CardContent>
              </Card>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function FeaturedStrategyCard({ strategy }: { strategy: any }) {
  return (
    <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31] relative overflow-hidden">
      <CardContent className="p-6">
        <div className="absolute top-4 right-4">
          <Star className="h-5 w-5 text-[#D7FF00] fill-current" />
        </div>
        <Badge className="bg-[#D7FF00] text-[#14151A] mb-4">
          {strategy.category}
        </Badge>
        <h3 className="text-xl font-heading text-white mb-2">
          {strategy.title}
        </h3>
        <p className="text-[#8A8B91] mb-4">{strategy.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#8A8B91]">By {strategy.author}</span>
          <div className="flex items-center gap-2">
            <ThumbsUp className="h-4 w-4 text-[#D7FF00]" />
            <span className="text-sm text-[#8A8B91]">{strategy.votes}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StrategyCard({ strategy }: { strategy: any }) {
  return (
    <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
      <CardContent className="p-6">
        <Badge className="bg-[#2A2B31] text-white mb-4">
          {strategy.category}
        </Badge>
        <h3 className="text-xl font-heading text-white mb-2">
          {strategy.title}
        </h3>
        <p className="text-[#8A8B91] mb-4">{strategy.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#8A8B91]">By {strategy.author}</span>
          <div className="flex items-center gap-2">
            <ThumbsUp className="h-4 w-4 text-[#8A8B91]" />
            <span className="text-sm text-[#8A8B91]">{strategy.votes}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
