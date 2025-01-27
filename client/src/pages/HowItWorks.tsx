import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Gift, Users, MessageCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageTransition } from "@/components/PageTransition";

export default function HowItWorks() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-[#14151A] text-white">
        <div className="container mx-auto px-4 py-8 md:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <Link href="/" className="inline-flex items-center gap-2 text-[#D7FF00] hover:text-[#D7FF00]/80 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>

            <div className="prose prose-invert max-w-none">
              <h1 className="text-4xl md:text-5xl font-heading font-bold text-[#D7FF00] mb-8">
                How It Works
              </h1>

              {/* Step 1: Getting Started */}
              <section className="mb-12">
                <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        <div className="w-8 h-8 rounded-full bg-[#D7FF00] flex items-center justify-center text-[#14151A] font-bold">
                          1
                        </div>
                      </div>
                      <div>
                        <h2 className="text-2xl font-heading font-bold text-white mb-4">
                          Sign Up with a Promo Code
                        </h2>
                        <p className="text-[#8A8B91] mb-4">
                          Start by registering on Goated using one of our exclusive promo codes:
                        </p>
                        <div className="flex flex-wrap gap-4 mb-4">
                          <Card className="bg-[#2A2B31] border-[#3A3B41] p-3">
                            <code className="text-[#D7FF00]">GOATEDVIPS</code>
                          </Card>
                          <Card className="bg-[#2A2B31] border-[#3A3B41] p-3">
                            <code className="text-[#D7FF00]">VIPBOOST</code>
                          </Card>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => window.open("https://www.goated.com/r/GOATEDVIPS", "_blank")}
                            className="bg-[#D7FF00] text-[#14151A] hover:bg-[#D7FF00]/90"
                          >
                            Sign Up Now
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Step 2: Account Linking */}
              <section className="mb-12">
                <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        <div className="w-8 h-8 rounded-full bg-[#D7FF00] flex items-center justify-center text-[#14151A] font-bold">
                          2
                        </div>
                      </div>
                      <div>
                        <h2 className="text-2xl font-heading font-bold text-white mb-4">
                          Track Your Progress
                        </h2>
                        <p className="text-[#8A8B91] mb-4">
                          After registering, you can track your wagering progress and rewards right here at the Goated x Goombas VIP Hub. Our platform automatically syncs with your Goated account to show:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-[#8A8B91] mb-4">
                          <li>Current wagering progress</li>
                          <li>Available rewards and bonuses</li>
                          <li>Wager race rankings</li>
                          <li>VIP status and benefits</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Step 3: Telegram Integration */}
              <section className="mb-12">
                <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        <div className="w-8 h-8 rounded-full bg-[#D7FF00] flex items-center justify-center text-[#14151A] font-bold">
                          3
                        </div>
                      </div>
                      <div>
                        <h2 className="text-2xl font-heading font-bold text-white mb-4">
                          Join Our Telegram Community
                        </h2>
                        <p className="text-[#8A8B91] mb-4">
                          Get access to our exclusive Telegram channel where we share:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-[#8A8B91] mb-4">
                          <li>Daily bonus code drops</li>
                          <li>Exclusive promotions</li>
                          <li>Community updates</li>
                          <li>VIP support</li>
                        </ul>
                        <Button
                          onClick={() => window.open("/telegram", "_self")}
                          className="bg-[#229ED9] hover:bg-[#229ED9]/90 text-white"
                        >
                          Join Telegram
                          <MessageCircle className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Benefits Overview */}
              <section className="mb-12">
                <h2 className="text-2xl font-heading font-bold text-[#D7FF00] mb-6">
                  Your VIP Benefits
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
                    <CardContent className="p-6">
                      <Gift className="h-8 w-8 text-[#D7FF00] mb-4" />
                      <h3 className="text-xl font-heading font-bold text-white mb-2">
                        Daily Rewards
                      </h3>
                      <p className="text-[#8A8B91]">
                        Access exclusive bonus codes and daily rewards through our Telegram channel
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
                    <CardContent className="p-6">
                      <Users className="h-8 w-8 text-[#D7FF00] mb-4" />
                      <h3 className="text-xl font-heading font-bold text-white mb-2">
                        Community Events
                      </h3>
                      <p className="text-[#8A8B91]">
                        Participate in exclusive giveaways and community competitions
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
                    <CardContent className="p-6">
                      <Star className="h-8 w-8 text-[#D7FF00] mb-4" />
                      <h3 className="text-xl font-heading font-bold text-white mb-2">
                        VIP Treatment
                      </h3>
                      <p className="text-[#8A8B91]">
                        Enjoy personalized support and exclusive VIP perks
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
                    <CardContent className="p-6">
                      <Gift className="h-8 w-8 text-[#D7FF00] mb-4" />
                      <h3 className="text-xl font-heading font-bold text-white mb-2">
                        Wager Races
                      </h3>
                      <p className="text-[#8A8B91]">
                        Compete in our weekly and monthly wager races for prize pools
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </section>
            </div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}