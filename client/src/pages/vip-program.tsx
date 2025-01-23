import { motion } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Trophy, Star, Gift, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const vipLevels = [
  {
    level: "Copper",
    benefits: ["Starting rank"]
  },
  {
    level: "Bronze",
    benefits: [
      "Instant Rakeback",
      "Level Up Bonus",
      "Weekly Bonus"
    ]
  },
  {
    level: "Silver",
    benefits: [
      "Instant Rakeback",
      "Level Up Bonus",
      "Weekly Bonus",
      "Monthly Bonus",
      "Bonus Increase"
    ]
  },
  {
    level: "Platinum",
    benefits: [
      "Instant Rakeback",
      "Level Up Bonus",
      "Weekly Bonus",
      "Monthly Bonus",
      "Bonus Increase",
      "Referral Increase",
      "Loss Back Bonus"
    ]
  },
  {
    level: "Pearl",
    benefits: [
      "Instant Rakeback",
      "Level Up Bonus",
      "Weekly Bonus",
      "Monthly Bonus",
      "Bonus Increase",
      "Referral Increase",
      "Loss Back Bonus"
    ]
  },
  {
    level: "Sapphire",
    benefits: [
      "Instant Rakeback",
      "Level Up Bonus",
      "Weekly Bonus",
      "Monthly Bonus",
      "Bonus Increase",
      "Referral Increase",
      "Loss Back Bonus",
      "VIP Host"
    ]
  },
  {
    level: "Emerald",
    benefits: [
      "Instant Rakeback",
      "Level Up Bonus",
      "Weekly Bonus",
      "Monthly Bonus",
      "Bonus Increase",
      "Referral Increase",
      "Loss Back Bonus",
      "VIP Host",
      "Goated Event Invitations"
    ]
  },
  {
    level: "Diamond",
    benefits: [
      "Instant Rakeback",
      "Level Up Bonus",
      "Weekly Bonus",
      "Monthly Bonus",
      "Bonus Increase",
      "Referral Increase",
      "Loss Back Bonus",
      "VIP Host",
      "Goated Event Invitations"
    ]
  }
];

export default function VipProgram() {
  return (
    <div className="min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto px-4 py-16"
      >
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 text-[#D7FF00]">VIP PROGRAM</h1>
          <p className="text-xl text-foreground max-w-3xl mx-auto">
            Experience exclusive benefits, personalized service, and enhanced rewards as you progress through our VIP levels.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card>
            <CardHeader>
              <Trophy className="h-8 w-8 text-[#D7FF00] mb-2" />
              <CardTitle>Instant Rakeback</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">
                Earn cashback on your wagers instantly, with increasing rates as you climb the VIP ladder.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Star className="h-8 w-8 text-[#D7FF00] mb-2" />
              <CardTitle>Level Up Bonus</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">
                Receive substantial bonuses every time you advance to a new VIP level.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Gift className="h-8 w-8 text-[#D7FF00] mb-2" />
              <CardTitle>Weekly & Monthly Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">
                Regular bonuses based on your activity, with enhanced rewards for higher VIP levels.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-8 w-8 text-[#D7FF00] mb-2" />
              <CardTitle>VIP Support</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">
                Dedicated VIP host and priority support for Sapphire level and above.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-16">
          <CardHeader>
            <CardTitle>VIP Levels & Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Level</TableHead>
                  <TableHead>Benefits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vipLevels.map((level) => (
                  <TableRow key={level.level}>
                    <TableCell>{level.level}</TableCell>
                    <TableCell>
                      <ul className="list-disc list-inside">
                        {level.benefits.map((benefit, index) => (
                          <li key={index} className="text-foreground">{benefit}</li>
                        ))}
                      </ul>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button
            onClick={() => window.open('https://www.goated.com/r/SPIN', '_blank')}
            className="bg-[#D7FF00] text-[#14151A] hover:bg-[#D7FF00]/90"
          >
            Join VIP Program <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}