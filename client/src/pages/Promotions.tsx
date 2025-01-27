import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Timer, ExternalLink, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// Current active promotions
const PROMOTIONS = [
  {
    id: 1,
    title: "$10,000 Weekly Race",
    description: "We've boosted our Weekly Race to $10,000 USD! Join now and compete for massive prizes with more chances to win. Top 10 players share the prize pool, with $5,000 for 1st place!",
    imageUrl: "/images/PROMOS/WEEKLYRACE.WEBP",
    category: "VIP",
    validUntil: "2025-05-31",
    isNew: true,
    details: {
      overview: "Our Weekly Race is now bigger and better than ever with an upgraded prize pool of $10,000 USD! More prizes, more chances to win—are you ready to claim your share?",
      howToJoin: "Place your bets, climb the weekly leaderboard, and secure a spot in the top 10 to win your share of the rewards! Once the race concludes at the end of the week, your prize will be instantly credited to your VIP rewards!",
      prizeDistribution: {
        1: 5000,
        2: 2500,
        3: 1000,
        4: 500,
        5: 350,
        6: 250,
        7: 150,
        8: 125,
        9: 75,
        10: 50
      }
    },
    link: "https://www.goated.com/promotions",
  },
  {
    id: 2,
    title: "Lunar New Year Special",
    description: "Celebrate the Lunar New Year with special bonuses and rewards. Limited time offer!",
    imageUrl: "/images/PROMOS/LUNAR1.WEBP",
    category: "Casino",
    validUntil: "2024-02-29",
    isNew: true,
    link: "https://www.goated.com/promotions",
  },
  {
    id: 3,
    title: "Pragmatic Play Tournament",
    description: "Join our exclusive Pragmatic Play tournament for a chance to win big prizes and boost your winnings!",
    imageUrl: "/images/PROMOS/PRAG1.WEBP",
    category: "Casino",
    validUntil: "2024-03-31",
    isNew: false,
    link: "https://www.goated.com/promotions",
  },
  {
    id: 4,
    title: "Weekly Challenge",
    description: "Take part in our weekly challenges to earn rewards and climb the leaderboard rankings!",
    imageUrl: "/images/PROMOS/CHLNG1.WEBP",
    category: "Sports",
    validUntil: "2024-12-31",
    isNew: false,
    link: "https://www.goated.com/promotions",
  }
];

export default function Promotions() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState("all");

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

  return (
    <div className="min-h-screen bg-[#14151A] text-white">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Back Button */}
          <motion.div variants={itemVariants} className="flex justify-start mb-8">
            <Button
              variant="ghost"
              className="gap-2"
              onClick={() => setLocation("/")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </motion.div>

          {/* Video Header */}
          <motion.div variants={itemVariants} className="mb-8">
            <video
              key="promo-video"
              autoPlay
              muted
              playsInline
              className="w-[350px] md:w-[450px] mx-auto rounded-xl"
            >
              <source src="/images/Page Headers/PROMOHEAD.MP4" type="video/mp4" />
            </video>
          </motion.div>

          {/* Description Text */}
          <motion.div variants={itemVariants} className="text-center mb-12">
            <p className="text-lg text-gray-300 max-w-3xl mx-auto">
              Stay up to date with all of Goated's latest promotions, bonuses, and platform updates, 
              including exclusive news about Goombas x Goated VIPs partnership. Check back regularly 
              to see ongoing promotions currently available on Goated.com and discover new opportunities 
              to maximize your gaming experience.
            </p>
          </motion.div>

          {/* Filter Section */}
          <motion.div
            variants={itemVariants}
            className="flex justify-end items-center gap-4"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#8A8B91]" />
              <Select
                value={filter}
                onValueChange={setFilter}
              >
                <SelectTrigger className="w-[180px] bg-[#1A1B21] border-[#2A2B31]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Promotions</SelectItem>
                  <SelectItem value="casino">Casino</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          {/* Promotions Grid */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {PROMOTIONS.map((promo) => (
              <Card
                key={promo.id}
                className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31] overflow-hidden group hover:border-[#D7FF00] transition-colors duration-300"
              >
                <CardContent className="p-0">
                  <div className="relative">
                    <img
                      src={promo.imageUrl}
                      alt={promo.title}
                      className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "https://placehold.co/400x200/1A1B21/D7FF00?text=Promotion";
                      }}
                    />
                    {promo.isNew && (
                      <Badge className="absolute top-4 right-4 bg-[#D7FF00] text-[#14151A]">
                        NEW
                      </Badge>
                    )}
                  </div>
                  <div className="p-6 space-y-4">
                    <h3 className="text-xl font-heading font-bold text-white">
                      {promo.title}
                    </h3>
                    <p className="text-[#8A8B91]">{promo.description}</p>
                    <div className="flex items-center gap-4 text-sm text-[#8A8B91]">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Valid until {promo.validUntil}</span>
                      </div>
                      <Badge variant="outline">{promo.category}</Badge>
                    </div>
                    <Button
                      onClick={() => window.open(promo.link, "_blank")}
                      className="w-full bg-[#D7FF00] text-[#14151A] hover:bg-[#D7FF00]/90 gap-2"
                    >
                      View Promotion
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* Empty State */}
          {PROMOTIONS.length === 0 && (
            <motion.div
              variants={itemVariants}
              className="text-center py-12 text-[#8A8B91]"
            >
              <p>No promotions found for the selected category.</p>
            </motion.div>
          )}

          {/* Newsletter Section */}
          <motion.div variants={itemVariants}>
            <Card className="bg-[#D7FF00] border-none">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <h2 className="text-2xl font-heading font-bold text-[#14151A]">
                    Never Miss a Promotion
                  </h2>
                  <p className="text-[#14151A]/80">
                    Join our Telegram channel to stay updated with the latest
                    promotions and exclusive offers!
                  </p>
                  <Button
                    onClick={() => setLocation("/telegram")}
                    className="bg-[#14151A] text-white hover:bg-[#14151A]/90"
                  >
                    Join Our Telegram
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
