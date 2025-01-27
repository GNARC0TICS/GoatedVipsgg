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

// Temporary data structure for promotions
const PROMOTIONS = [
  {
    id: 1,
    title: "Example Promotion",
    description: "This is a placeholder for promotion description...",
    imageUrl: "/images/PROMOS/placeholder.jpg",
    category: "Casino",
    validUntil: "2024-02-28",
    isNew: true,
    link: "https://www.goated.com/promotions",
  },
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
          {/* Header */}
          <motion.div variants={itemVariants}>
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
              autoPlay
              muted
              playsInline
              loop
              className="w-[300px] md:w-[400px] mx-auto rounded-xl"
            >
              <source src="/images/Page Headers/PROMOHEAD.MP4" type="video/mp4" />
            </video>
          </motion.div>

          {/* Title Section */}
          <motion.div variants={itemVariants} className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-[#D7FF00]">
              Current Promotions
            </h1>
            <p className="text-lg text-[#8A8B91] max-w-2xl mx-auto">
              Discover the latest promotions and bonuses available on Goated. Don't
              miss out on these exclusive offers!
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
