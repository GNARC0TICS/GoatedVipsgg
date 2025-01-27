import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Gift,
  Users,
  MessageCircle,
  Star,
  Clipboard,
  ChevronRight,
  Chart,
  Trophy,
} from "lucide-react";
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
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[#D7FF00] hover:text-[#D7FF00]/80 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>

            <div className="prose prose-invert max-w-none">
              <h1 className="text-4xl md:text-5xl font-heading font-bold text-[#D7FF00] mb-8">
                How It Works
              </h1>

              {/* Step 1: Sign Up */}
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
                          Sign Up with Our Promo Code
                        </h2>
                        <p className="text-[#8A8B91] mb-4">
                          Start by registering on Goated using one of our exclusive promo codes:
                        </p>
                        <div className="flex flex-wrap gap-4 mb-6">
                          <div className="relative group">
                            <Card className="bg-[#2A2B31] border-[#3A3B41] p-3 transition-all duration-300 group-hover:border-[#D7FF00]">
                              <div className="flex items-center gap-2">
                                <code className="text-[#D7FF00]">GOATEDVIPS</code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-[#8A8B91] hover:text-[#D7FF00]"
                                  onClick={() => {
                                    navigator.clipboard.writeText("GOATEDVIPS");
                                  }}
                                >
                                  <Clipboard className="h-4 w-4" />
                                </Button>
                              </div>
                            </Card>
                          </div>
                          <div className="relative group">
                            <Card className="bg-[#2A2B31] border-[#3A3B41] p-3 transition-all duration-300 group-hover:border-[#D7FF00]">
                              <div className="flex items-center gap-2">
                                <code className="text-[#D7FF00]">VIPBOOST</code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-[#8A8B91] hover:text-[#D7FF00]"
                                  onClick={() => {
                                    navigator.clipboard.writeText("VIPBOOST");
                                  }}
                                >
                                  <Clipboard className="h-4 w-4" />
                                </Button>
                              </div>
                            </Card>
                          </div>
                        </div>
                        <div className="space-y-4 mb-6">
                          <div className="flex items-center gap-2 text-sm text-[#8A8B91]">
                            <ChevronRight className="h-4 w-4 text-[#D7FF00]" />
                            Visit Goated.com and click "Sign Up"
                          </div>
                          <div className="flex items-center gap-2 text-sm text-[#8A8B91]">
                            <ChevronRight className="h-4 w-4 text-[#D7FF00]" />
                            Enter your details and one of our promo codes above
                          </div>
                          <div className="flex items-center gap-2 text-sm text-[#8A8B91]">
                            <ChevronRight className="h-4 w-4 text-[#D7FF00]" />
                            Complete registration to activate VIP benefits
                          </div>
                        </div>
                        <Button
                          onClick={() =>
                            window.open("https://www.goated.com/r/GOATEDVIPS", "_blank")
                          }
                          className="bg-[#D7FF00] text-[#14151A] hover:bg-[#D7FF00]/90"
                        >
                          Sign Up Now
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Step 2: Track Progress */}
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
                          After registering, track your wagering progress and rewards right here at the Goated x Goombas VIP Hub. Our platform automatically syncs with your Goated account to show:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          <Card className="bg-[#2A2B31] border-[#3A3B41] p-4">
                            <div className="flex items-start gap-3">
                              <Chart className="h-5 w-5 text-[#D7FF00] mt-1" />
                              <div>
                                <h3 className="font-bold text-white mb-1">Wagering Progress</h3>
                                <p className="text-sm text-[#8A8B91]">
                                  Real-time tracking of your wagering volume
                                </p>
                              </div>
                            </div>
                          </Card>
                          <Card className="bg-[#2A2B31] border-[#3A3B41] p-4">
                            <div className="flex items-start gap-3">
                              <Gift className="h-5 w-5 text-[#D7FF00] mt-1" />
                              <div>
                                <h3 className="font-bold text-white mb-1">Available Rewards</h3>
                                <p className="text-sm text-[#8A8B91]">
                                  View and claim your earned bonuses
                                </p>
                              </div>
                            </div>
                          </Card>
                          <Card className="bg-[#2A2B31] border-[#3A3B41] p-4">
                            <div className="flex items-start gap-3">
                              <Trophy className="h-5 w-5 text-[#D7FF00] mt-1" />
                              <div>
                                <h3 className="font-bold text-white mb-1">Race Rankings</h3>
                                <p className="text-sm text-[#8A8B91]">
                                  Check your position in wager races
                                </p>
                              </div>
                            </div>
                          </Card>
                          <Card className="bg-[#2A2B31] border-[#3A3B41] p-4">
                            <div className="flex items-start gap-3">
                              <Star className="h-5 w-5 text-[#D7FF00] mt-1" />
                              <div>
                                <h3 className="font-bold text-white mb-1">VIP Status</h3>
                                <p className="text-sm text-[#8A8B91]">
                                  Monitor your VIP level and benefits
                                </p>
                              </div>
                            </div>
                          </Card>
                        </div>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          <div className="flex items-center gap-3 bg-[#2A2B31] p-4 rounded-lg">
                            <Gift className="h-5 w-5 text-[#D7FF00]" />
                            <span className="text-sm">Daily Bonus Code Drops</span>
                          </div>
                          <div className="flex items-center gap-3 bg-[#2A2B31] p-4 rounded-lg">
                            <Trophy className="h-5 w-5 text-[#D7FF00]" />
                            <span className="text-sm">Exclusive Promotions</span>
                          </div>
                          <div className="flex items-center gap-3 bg-[#2A2B31] p-4 rounded-lg">
                            <Users className="h-5 w-5 text-[#D7FF00]" />
                            <span className="text-sm">Community Updates</span>
                          </div>
                          <div className="flex items-center gap-3 bg-[#2A2B31] p-4 rounded-lg">
                            <MessageCircle className="h-5 w-5 text-[#D7FF00]" />
                            <span className="text-sm">VIP Support</span>
                          </div>
                        </div>
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

export default HowItWorks;