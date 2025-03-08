import * as React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, Gift, Trophy, Shield, Clock, Sparkles } from "lucide-react";

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface FeaturesProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  features?: Feature[];
}

export default function Features01({
  className,
  title = "Why Choose Goated",
  subtitle = "Experience the best of gaming with these exclusive features designed to enhance your gameplay and rewards.",
  features,
  ...props
}: FeaturesProps) {
  const defaultFeatures: Feature[] = [
    {
      icon: <TrendingUp className="h-6 w-6 text-[#D7FF00]" />,
      title: "Daily Wager Races",
      description: "Compete in daily wager races and climb the leaderboard to win exclusive prizes.",
    },
    {
      icon: <Gift className="h-6 w-6 text-[#D7FF00]" />,
      title: "Generous Rewards",
      description: "Earn rewards for every wager and unlock special bonuses as you level up.",
    },
    {
      icon: <Trophy className="h-6 w-6 text-[#D7FF00]" />,
      title: "Weekly Tournaments",
      description: "Join weekly tournaments with massive prize pools and special entry bonuses.",
    },
    {
      icon: <Shield className="h-6 w-6 text-[#D7FF00]" />,
      title: "Secure Gaming",
      description: "Play with confidence on our secure platform with advanced encryption.",
    },
    {
      icon: <Clock className="h-6 w-6 text-[#D7FF00]" />,
      title: "24/7 Support",
      description: "Get help anytime with our dedicated support team, available round the clock.",
    },
    {
      icon: <Sparkles className="h-6 w-6 text-[#D7FF00]" />,
      title: "VIP Perks",
      description: "Unlock exclusive VIP benefits and personalized rewards as you reach higher tiers.",
    },
  ];

  const displayFeatures = features || defaultFeatures;

  return (
    <section
      className={cn("bg-zinc-950 py-16 md:py-24", className)}
      {...props}
    >
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter text-white sm:text-4xl md:text-5xl">
              {title}
            </h2>
            <p className="mx-auto max-w-[700px] text-zinc-400 md:text-xl">
              {subtitle}
            </p>
          </div>
        </div>
        <div className="mx-auto mt-12 grid max-w-5xl gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3">
          {displayFeatures.map((feature, index) => (
            <div key={index} className="grid gap-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-white">
                {feature.title}
              </h3>
              <p className="text-zinc-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}